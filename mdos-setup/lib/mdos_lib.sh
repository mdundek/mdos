#!/bin/bash

os_check() {
    # CHECK PACKAGE SYSTEM
    if command -v apt-get >/dev/null; then
        PSYSTEM="APT"
    elif command -v yum >/dev/null; then
        error "Unsupported linux package system"
        exit 1
    else
        error "Unsupported linux package system"
        exit 1
    fi

    # DETERMINE DISTRO
    UNAME=$(uname | tr "[:upper:]" "[:lower:]")
    # If Linux, try to determine specific distribution
    if [ "$UNAME" == "linux" ]; then
        # If available, use LSB to identify distribution
        if [ -f /etc/lsb-release -o -d /etc/lsb-release.d ]; then
            export DISTRO=$(lsb_release -i | cut -d: -f2 | sed s/'^\t'//)
        # Otherwise, use release info file
        else
            export DISTRO=$(ls -d /etc/[A-Za-z]*[_-][rv]e[lr]* | grep -v "lsb" | cut -d'/' -f3 | cut -d'-' -f1 | cut -d'_' -f1)
        fi
    fi
    # For everything else (or if above failed), just use generic identifier
    [ "$DISTRO" == "" ] && export DISTRO=$UNAME
    unset UNAME

    # MAKE SURE DISTRO IS SUPPORTED
    if [ "$DISTRO" == "" ]; then
        error "Unknown linux distribution"
        exit 1
    elif [ "$DISTRO" != "Ubuntu" ]; then
        error "Unsupported linux distribution: ${DISTRO}"
        exit 1
    fi 
}

resources_check() {
    # CHECK THAT SUFFICIENT MEMORY AND DISK IS AVAILABLE
    FREE_MB=$(awk '/MemFree/ { printf "%.0f \n", $2/1024 }' /proc/meminfo)
    if [ "$FREE_MB" -lt "$1" ]; then
        error "Insufficient memory, minimum $2 of available (free) memory is required for this installation"
        exit 1
    fi
}

init_firewall() {
    # SET UP FIREWALL (ufw)
    if command -v ufw >/dev/null; then
        if [ "$(ufw status | grep 'Status: active')" == "" ]; then
            question "Your firewall is currently disabled."
            yes_no USE_FIREWALL "Do you want to enable it now and configure the necessary ports for the platform?" 1
            if [ "$USE_FIREWALL" == "yes" ]; then
                ufw enable
            fi
        else
            USE_FIREWALL="yes"
        fi

        if [ "$USE_FIREWALL" == "yes" ]; then
            if [ "$(ufw status | grep '22/tcp' | grep 'ALLOW')" == "" ]; then
                ufw allow ssh &>> $LOG_FILE
            fi
            echo ""
        fi
    else
        warn "Configure your firewall to allow traffic on port 0.0.0.0:22, 0.0.0.0:30979 and 192.168.0.0/16:8080"
    fi
}

# ############### UPDATE ENV DATA VALUE ################
set_env_step_data() {
    sed -i '/'$1'=/d' $INST_ENV_PATH
    echo "$1=$2" >> $INST_ENV_PATH
}

# ############### CHECK KUBE RESOURCE ################
check_kube_namespace() {
    local __resultvar=$1
    while read K_LINE ; do 
        K_NAME=`echo "$K_LINE" | cut -d' ' -f 1`
        if [ "$K_NAME" == "$2" ]; then
            eval $__resultvar=1
        fi
    done < <(kubectl get ns 2>/dev/null)
}

# ############### MDOS APP DEPLOY ################
mdos_deploy_app() {
    I_APP=$(cat ./target_values.yaml | yq eval '.appName')
    I_NS=$(cat ./target_values.yaml | yq eval '.tenantName')
    unset NS_EXISTS
    while read NS_LINE ; do 
        NS_NAME=`echo "$NS_LINE" | cut -d' ' -f 1`
        if [ "$NS_NAME" == "$I_NS" ]; then
            NS_EXISTS=1
        fi
    done < <(kubectl get ns 2>/dev/null)
    if [ -z $NS_EXISTS ]; then
        kubectl create ns $I_NS &>> $LOG_FILE
        if [ ! -z $1 ] && [ "$1" == "true" ]; then
            kubectl label ns $I_NS istio-injection=enabled &>> $LOG_FILE
        fi
    fi
    if [ ! -z $2 ] && [ "$2" == "true" ]; then
        unset SECRET_EXISTS
        while read SECRET_LINE ; do 
            NS_NAME=`echo "$SECRET_LINE" | cut -d' ' -f 1`
            if [ "$NS_NAME" == "regcred" ]; then
                SECRET_EXISTS=1
            fi
        done < <(kubectl get secret -n $I_NS 2>/dev/null)

        if [ -z $SECRET_EXISTS ]; then
            kubectl create secret docker-registry \
                regcred \
                --docker-server=registry.$DOMAIN \
                --docker-username=$KEYCLOAK_USER \
                --docker-password=$KEYCLOAK_PASS \
                -n $I_NS &>> $LOG_FILE
        fi
    fi

    set +Ee
    unset DEPLOY_SUCCESS
    while [ -z $DEPLOY_SUCCESS ]; do
        helm upgrade --install $I_APP ./dep/mhc-generic/chart \
            --values ./target_values.yaml \
            -n $I_NS --atomic &>> $LOG_FILE
        if [ $? -eq 0 ]; then
            DEPLOY_SUCCESS=1
        else
            sleep 5
        fi
    done
    set -Ee
}

# ############### EXEC IN POD ################
exec_in_pod() {
    POD_CANDIDATES=()
    NS_CANDIDATES=()
    while read DEPLOYMENT_LINE ; do 
        POD_NAME=`echo "$DEPLOYMENT_LINE" | awk 'END {print $2}'`
        NS_NAME=`echo "$DEPLOYMENT_LINE" | awk 'END {print $1}'`
        if [[ "$POD_NAME" == *"$1"* ]]; then
            POD_CANDIDATES+=($POD_NAME)
            NS_CANDIDATES+=($NS_NAME)
        fi
    done < <(kubectl get pod -A 2>/dev/null)

    if [ ${#POD_CANDIDATES[@]} -eq 0 ]; then
        error "Could not find any candidates for this pod name"
        exit 1
    else
        k3s kubectl exec --stdin --tty ${POD_CANDIDATES[0]} -n ${NS_CANDIDATES[0]} -- $2
    fi
}

# ############### LOGIN TO LOCAL REGISTRY IN FALESAFE MANNER ################
failsafe_docker_login() {
    set +Ee
    while [ -z $DOCKER_LOGIN_SUCCESS ]; do
        echo "${KEYCLOAK_PASS}" | docker login registry.$DOMAIN --username ${KEYCLOAK_USER} --password-stdin &>> $LOG_FILE
        if [ $? -eq 0 ]; then
            DOCKER_LOGIN_SUCCESS=1
        else
            sleep 5
        fi
    done
    set -Ee
}

# ############### PUSH TO LOCAL REGISTRY IN FALESAFE MANNER ################
failsafe_docker_push() {
    set +Ee
    unset DKPUSH_SUCCESS
    PUSHING_DOCKER=1
    while [ -z $DKPUSH_SUCCESS ]; do
        docker push $1 &>> $LOG_FILE
        if [ $? -eq 0 ]; then
            DKPUSH_SUCCESS=1
        else
            sleep 10
        fi
    done
    unset PUSHING_DOCKER
    set -Ee
}

# ############################################
# ############### DEPENDENCIES ###############
# ############################################
dependencies() {
    if [ "$PSYSTEM" == "APT" ]; then
        apt-get update -y &>> $LOG_FILE
        apt-get upgrade -y &>> $LOG_FILE
        apt-get install \
            jq \
            ca-certificates \
            curl \
            gnupg \
            apache2-utils \
            python3 \
            unzip \
            snapd \
            nfs-common \
            lsb-release -y &>> $LOG_FILE
        snap install yq &>> $LOG_FILE

        systemctl enable iscsid &>> $LOG_FILE

        # Docker binary
        if [ "$DISTRO" == "Ubuntu" ]; then
            if ! command -v docker &> /dev/null; then
                curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

                echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
                    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

                apt-get update &>> $LOG_FILE
                apt-get install docker-ce docker-ce-cli containerd.io -y &>> $LOG_FILE

                groupadd docker &>> $LOG_FILE || true

                getent passwd | while IFS=: read -r name password uid gid gecos home shell; do
                    if [ -d "$home" ] && [ "$(stat -c %u "$home")" = "$uid" ] && [ "$home" == "/home/$name" ]; then
                        usermod -aG docker $name
                    fi
                done
            fi
            
            # Install docker compose
            apt-get install docker-compose-plugin -y &>> $LOG_FILE
        fi
    fi
}