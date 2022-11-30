#!/bin/bash

internet_check() {
    wget -q --spider http://google.com
    if [ $? -ne 0 ]; then
        error "You need access to the internet in order to install the MDos platform."
        exit 1
    fi
}

docker_internet_check() {
    # Make sure Docker has a DNS server configured (only on YUM systems, had some issues with this on Centos)
    if [ "$PSYSTEM" == "DNF" ]; then
        if [ ! -f /etc/docker/daemon.json ] || [ "$(cat /etc/docker/daemon.json | grep "dns" | xargs)" == "dns: []" ]; then
            DNS_IP=$(cat /etc/resolv.conf | grep -m 1 "nameserver " | head -1 | cut -d ' ' -f 2)
            if [ "$DNS_IP" != "" ]; then
                touch /etc/docker/daemon.json
                echo "{
        \"dns\": [\"$DNS_IP\"]
    }" > /etc/docker/daemon.json
                systemctl restart docker
            fi
        fi
    fi

    docker pull curlimages/curl:latest &>> $LOG_FILE
    DCON=$(docker run --rm curlimages/curl:latest -sI https://oauth2-proxy.github.io/manifests/index.yaml)
    DCON=$(echo "$DCON" | grep "HTTP/2 200")
    if [ "$DCON" == "" ]; then
        error "Your docker daemon does not seem to have internet connectivity."
        exit 1
    fi
}

kube_internet_check() {
    local  __resultvar=$1
    docker pull curlimages/curl:latest
    set +Ee
    unset CTEST_DONE
    ATTEMPTS=0
    while [ -z $CTEST_DONE ]; do
        KCON=$($kubectl run mycurlpod --rm --image=curlimages/curl:latest --stdin --tty -- /bin/sh -c "sleep 3 && curl -Is https://oauth2-proxy.github.io/manifests/index.yaml")
        KCON=$(echo "$KCON" | grep "HTTP/2 200")
        if [ "$KCON" != "" ]; then
            eval $__resultvar="0"
            CTEST_DONE=1
        else
            if [ "$ATTEMPTS" -gt 5 ]; then
                eval $__resultvar="1"
                CTEST_DONE=1
            fi
            ATTEMPTS=$((ATTEMPTS+1))
            
            restart_coredns
            sleep 3
        fi
    done
    set -Ee
}

restart_coredns() {
    # Restart the CoreDNS pod
    unset FOUND_RUNNING_POD
    while [ -z $FOUND_RUNNING_POD ]; do
        while read POD_LINE ; do 
            COREDNS_POD_NAME=`echo "$POD_LINE" | awk 'END {print $1}'`
            POD_STATUS=`echo "$POD_LINE" | awk 'END {print $3}'`
            if [ "$POD_STATUS" == "Running" ]; then
                FOUND_RUNNING_POD=1
            fi
        done < <($kubectl get pods -n kube-system | grep "coredns" 2>/dev/null)
        sleep 1
    done
    
    $kubectl delete pod $COREDNS_POD_NAME -n kube-system &>> $LOG_FILE
}

os_check() {
    # CHECK PACKAGE SYSTEM
    if command -v apt-get >/dev/null; then
        PSYSTEM="APT"
    elif command -v dnf >/dev/null; then
        PSYSTEM="DNF"
    else
        error "Unsupported linux package system"
        exit 1
    fi

    # DETERMINE DISTRO
    UNAME=$(uname | tr "[:upper:]" "[:lower:]")
    # If Linux, try to determine specific distribution
    if [ "$UNAME" == "linux" ]; then
        # If available, use LSB to identify distribution
        if [ -f /etc/os-release ]; then
            export DISTRO=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
            export DISTRO_VERSION=$(grep '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
        fi
    fi

    # MAKE SURE DISTRO IS SUPPORTED
    if [ -z $DISTRO ]; then
        error "Unknown linux distribution"
        exit 1
    elif [ "$DISTRO" != "ubuntu" ] && [ "$DISTRO" != "debian" ] && [ "$DISTRO" != "centos" ]; then
        error "Unsupported linux distribution: ${DISTRO}"
        exit 1
    fi 
}

resources_check() {
    # CHECK THAT SUFFICIENT MEMORY IS AVAILABLE
    FREE_MB=$(awk '/MemAvailable/ { printf "%.0f \n", $2/1024 }' /proc/meminfo)
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
    elif command -v firewall-cmd >/dev/null; then
        if [ "$(systemctl status firewalld | grep 'Active: active (running)')" == "" ]; then
            question "Your firewall is currently disabled."
            yes_no USE_FIREWALL "Do you want to enable it now and configure the necessary ports for the platform?" 1
            if [ "$USE_FIREWALL" == "yes" ]; then
                systemctl enable firewalld
                systemctl start firewalld
            fi
        else
            USE_FIREWALL="yes"
        fi
        
        if [ "$USE_FIREWALL" == "yes" ]; then
            if [ "$(firewall-cmd --list-all | grep 'services:' | grep 'ssh')" == "" ]; then
                firewall-cmd --zone=public --permanent --add-service=ssh &>> $LOG_FILE
            fi
            echo ""
        fi
    else
        warn "Configure your firewall to allow traffic on the following ports:"
        if [ "$1" == "master" ]; then
            context_print "          * 179   / TCP"
            context_print "          * 443   / TCP"
            context_print "          * 6443  / TCP"
            context_print "          * 30999 / TCP"
            context_print "          * 3915  / TCP"
            context_print "          * 3916  / TCP"
            context_print "          * 3917  / TCP"
            context_print "          * 3918  / TCP"
            context_print "          * 3919  / TCP"
            context_print "          * 3920  / TCP"
            context_print "          * 2379  / TCP"
            context_print "          * 2380  / TCP"
            context_print "          * 10250 / TCP"
            context_print "          * 10255 / TCP"
            context_print "          * 10259 / TCP"
            context_print "          * 10257 / TCP"
            context_print "          * 4789  / UDP"
        else
            context_print "          * 179   / TCP"
            context_print "          * 443   / TCP"
            context_print "          * 6443  / TCP"
            context_print "          * 2379  / TCP"
            context_print "          * 2380  / TCP"
            context_print "          * 30999 / TCP"
            context_print "          * 10250 / TCP"
            context_print "          * 10255 / TCP"
            context_print "          * 4789  / UDP"
        fi
        echo ""
    fi
}

setup_master_firewall() {
    # Enable firewall ports if necessary for NGinx port forwarding proxy to istio HTTPS ingress gateway
    if [ "$USE_FIREWALL" == "yes" ]; then
        if command -v ufw >/dev/null; then
            info "Setting up firewall rules..."
            if [ "$(ufw status | grep 'HTTPS\|443' | grep 'ALLOW')" == "" ]; then
                ufw allow 443 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep 'HTTPS\|6443' | grep 'ALLOW')" == "" ]; then
                ufw allow 6443 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep 'HTTPS\|30999' | grep 'ALLOW')" == "" ]; then
                ufw allow 30999 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '3915' | grep 'ALLOW')" == "" ]; then
                ufw allow 3915 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '3916' | grep 'ALLOW')" == "" ]; then
                ufw allow 3916 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '3917' | grep 'ALLOW')" == "" ]; then
                ufw allow 3917 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '3918' | grep 'ALLOW')" == "" ]; then
                ufw allow 3918 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '3919' | grep 'ALLOW')" == "" ]; then
                ufw allow 3919 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '3920' | grep 'ALLOW')" == "" ]; then
                ufw allow 3920 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '179' | grep 'ALLOW')" == "" ]; then
                ufw allow 179 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '4789' | grep 'ALLOW')" == "" ]; then
                ufw allow 4789 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '2379' | grep 'ALLOW')" == "" ]; then
                ufw allow 2379 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '2380' | grep 'ALLOW')" == "" ]; then
                ufw allow 2380 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '10250' | grep 'ALLOW')" == "" ]; then
                ufw allow 10250 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '10255' | grep 'ALLOW')" == "" ]; then
                ufw allow 10255 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '10259' | grep 'ALLOW')" == "" ]; then
                ufw allow 10259 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '10257' | grep 'ALLOW')" == "" ]; then
                ufw allow 10257 &>> $LOG_FILE
            fi
        elif command -v firewall-cmd >/dev/null; then
            info "Setting up firewall rules..."
            if [ "$(firewall-cmd --list-all | grep '443/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=443/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '6443/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=6443/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '30999/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=30999/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '3915/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=3915/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '3916/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=3916/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '3917/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=3917/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '3918/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=3918/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '3919/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=3919/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '3920/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=3920/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '179/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=179/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '4789/udp')" == "" ]; then
                firewall-cmd --zone=public --add-port=4789/udp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '2379/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=2379/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '2380/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=2380/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '10250/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=10250/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '10255/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=10255/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '10259/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=10259/tcp &>> $LOG_FILE
            fi
            if [ "$(firewall-cmd --list-all | grep '10257/tcp')" == "" ]; then
                firewall-cmd --zone=public --add-port=10257/tcp &>> $LOG_FILE
            fi
            firewall-cmd --permanent --add-masquerade &>> $LOG_FILE
            firewall-cmd --reload &>> $LOG_FILE
        fi
    fi
}

setup_worker_firewall() {
    # Enable firewall ports if necessary for NGinx port forwarding proxy to istio HTTPS ingress gateway
    if [ "$USE_FIREWALL" == "yes" ]; then
        if command -v ufw >/dev/null; then
            info "Setting up firewall rules..."
            if [ "$(ufw status | grep 'HTTPS\|443' | grep 'ALLOW')" == "" ]; then
                ufw allow 443 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep 'HTTPS\|6443' | grep 'ALLOW')" == "" ]; then
                ufw allow 6443 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep 'HTTPS\|30999' | grep 'ALLOW')" == "" ]; then
                ufw allow 30999 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '10250' | grep 'ALLOW')" == "" ]; then
                ufw allow 10250 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '10255' | grep 'ALLOW')" == "" ]; then
                ufw allow 10255 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '2379' | grep 'ALLOW')" == "" ]; then
                ufw allow 2379 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '2380' | grep 'ALLOW')" == "" ]; then
                ufw allow 2380 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '4789' | grep 'ALLOW')" == "" ]; then
                ufw allow 4789 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep '179' | grep 'ALLOW')" == "" ]; then
                ufw allow 179 &>> $LOG_FILE
            fi
        fi
    elif command -v firewall-cmd >/dev/null; then
        info "Setting up firewall rules..."
        if [ "$(firewall-cmd --list-all | grep '443/tcp')" == "" ]; then
            firewall-cmd --zone=public --add-port=443/tcp &>> $LOG_FILE
        fi
        if [ "$(firewall-cmd --list-all | grep '6443/tcp')" == "" ]; then
            firewall-cmd --zone=public --add-port=6443/tcp &>> $LOG_FILE
        fi
        if [ "$(firewall-cmd --list-all | grep '30999/tcp')" == "" ]; then
            firewall-cmd --zone=public --add-port=30999/tcp &>> $LOG_FILE
        fi
        if [ "$(firewall-cmd --list-all | grep '10250/tcp')" == "" ]; then
            firewall-cmd --zone=public --add-port=10250/tcp &>> $LOG_FILE
        fi
        if [ "$(firewall-cmd --list-all | grep '10255/tcp')" == "" ]; then
            firewall-cmd --zone=public --add-port=10255/tcp &>> $LOG_FILE
        fi
        if [ "$(firewall-cmd --list-all | grep '2379/tcp')" == "" ]; then
            firewall-cmd --zone=public --add-port=2379/tcp &>> $LOG_FILE
        fi
        if [ "$(firewall-cmd --list-all | grep '2380/tcp')" == "" ]; then
            firewall-cmd --zone=public --add-port=2380/tcp &>> $LOG_FILE
        fi
        if [ "$(firewall-cmd --list-all | grep '4789/udp')" == "" ]; then
            firewall-cmd --zone=public --add-port=4789/udp &>> $LOG_FILE
        fi
        if [ "$(firewall-cmd --list-all | grep '179/tcp')" == "" ]; then
            firewall-cmd --zone=public --add-port=179/tcp &>> $LOG_FILE
        fi
        firewall-cmd --permanent --add-masquerade &>> $LOG_FILE
        firewall-cmd --reload &>> $LOG_FILE
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
    done < <($kubectl get ns 2>/dev/null)
}

# ############### MDOS APP DEPLOY ################
mdos_deploy_app() {
    I_APP=$(cat ./target_values.yaml | /usr/local/bin/yq eval '.appName')
    I_NS=$(cat ./target_values.yaml | /usr/local/bin/yq eval '.tenantName')
    unset NS_EXISTS
    while read NS_LINE ; do 
        NS_NAME=`echo "$NS_LINE" | cut -d' ' -f 1`
        if [ "$NS_NAME" == "$I_NS" ]; then
            NS_EXISTS=1
        fi
    done < <($kubectl get ns 2>/dev/null)
    if [ -z $NS_EXISTS ]; then
        $kubectl create ns $I_NS &>> $LOG_FILE
        if [ ! -z $1 ] && [ "$1" == "true" ]; then
            $kubectl label ns $I_NS istio-injection=enabled &>> $LOG_FILE
        fi
    fi
    if [ ! -z $2 ] && [ "$2" == "true" ]; then
        unset SECRET_EXISTS
        while read SECRET_LINE ; do 
            NS_NAME=`echo "$SECRET_LINE" | cut -d' ' -f 1`
            if [ "$NS_NAME" == "regcred" ]; then
                SECRET_EXISTS=1
            fi
        done < <($kubectl get secret -n $I_NS 2>/dev/null)

        if [ -z $SECRET_EXISTS ]; then
            $kubectl create secret docker-registry \
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
        $helm upgrade --install $I_APP ./dep/mhc-generic/chart \
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
    done < <($kubectl get pod -A 2>/dev/null)

    if [ ${#POD_CANDIDATES[@]} -eq 0 ]; then
        error "Could not find any candidates for this pod name"
        exit 1
    else
        $kubectl exec --stdin --tty ${POD_CANDIDATES[0]} -n ${NS_CANDIDATES[0]} -- $2
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
dependencies_consent() {
    warn "This script will install some required dependencies:"
    if [ "$PSYSTEM" == "APT" ]; then
        context_print "          * ufw"
        context_print "          * jq"
        context_print "          * ca-certificates"
        context_print "          * curl"
        context_print "          * tar"
        context_print "          * gnupg"
        context_print "          * apache2-utils"
        context_print "          * python3"
        context_print "          * unzip"
        context_print "          * nfs-common"
        context_print "          * open-iscsi"
        context_print "          * lsb-release"
        
    elif [ "$PSYSTEM" == "DNF" ]; then
        context_print "          * yum-utils "
        context_print "          * firewalld"
        context_print "          * jq"
        context_print "          * tar"
        context_print "          * ca-certificates"
        context_print "          * curl"
        context_print "          * gnupg"
        context_print "          * httpd-tools"
        context_print "          * python3"
        context_print "          * unzip"
        context_print "          * nfs-utils"
        context_print "          * iscsi-initiator-utils"
        context_print "          * redhat-lsb-core"
    fi
    context_print "          * docker"
    context_print "          * helm"
    context_print "          * k3s"
    echo ""
    if [ "$PSYSTEM" == "DNF" ]; then
        context_print "          => and disable selinux"
        echo ""
    fi
    yes_no DEP_CONTINUE "Continue?" 1
    if [ "$DEP_CONTINUE" != "yes" ]; then
        exit 1
    fi
}

dependencies() {
    # -=-=-=-=-=-=-= DEBIAN, UBUNTU... -=-=-=-=-=-=-=
    if [ "$PSYSTEM" == "APT" ]; then
        apt-get update -y &>> $LOG_FILE
        apt-get upgrade -y &>> $LOG_FILE
        apt-get install \
            ufw \
            jq \
            ca-certificates \
            curl \
            tar \
            gnupg \
            apache2-utils \
            python3 \
            unzip \
            nfs-common \
            open-iscsi \
            lsb-release -y &>> $LOG_FILE
            
        systemctl enable iscsid &>> $LOG_FILE

        # Docker binary
        if [ "$DISTRO" == "ubuntu" ]; then
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
        elif [ "$DISTRO" == "debian" ]; then
            if ! command -v docker &> /dev/null; then
                mkdir -p /etc/apt/keyrings
                curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

                echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
                    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

                apt-get update -y &>> $LOG_FILE
                apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin &>> $LOG_FILE

                groupadd docker &>> $LOG_FILE || true

                getent passwd | while IFS=: read -r name password uid gid gecos home shell; do
                    if [ -d "$home" ] && [ "$(stat -c %u "$home")" = "$uid" ] && [ "$home" == "/home/$name" ]; then
                        usermod -aG docker $name
                    fi
                done
            fi
        fi
    # -=-=-=-=-=-=-= CENTOS, REDHAT... -=-=-=-=-=-=-=
    elif [ "$PSYSTEM" == "DNF" ]; then
        dnf update &>> $LOG_FILE
        dnf upgrade &>> $LOG_FILE
        dnf install \
            yum-utils \
            firewalld \
            jq \
            tar \
            ca-certificates \
            curl \
            gnupg \
            httpd-tools \
            python3 \
            unzip \
            nfs-utils \
            iscsi-initiator-utils \
            redhat-lsb-core -y &>> $LOG_FILE

        systemctl enable iscsid &>> $LOG_FILE

        setenforce 0
        sed -i 's/^SELINUX=enforcing$/SELINUX=permissive/' /etc/selinux/config

        if ! command -v docker &> /dev/null; then
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo &>> $LOG_FILE
            yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y --allowerasing &>> $LOG_FILE
            systemctl start docker &>> $LOG_FILE
            groupadd docker &>> $LOG_FILE || true
            getent passwd | while IFS=: read -r name password uid gid gecos home shell; do
                if [ -d "$home" ] && [ "$(stat -c %u "$home")" = "$uid" ] && [ "$home" == "/home/$name" ]; then
                    usermod -aG docker $name
                fi
            done
        fi
    fi

    # Increase file watcher for OS
    echo "fs.inotify.max_queued_events = 50384
fs.inotify.max_user_instances = 512
fs.inotify.max_user_watches = 110645" >> /etc/sysctl.conf
    sysctl --system &>> $LOG_FILE

    # Install yq
    wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
    chmod a+x /usr/local/bin/yq
}

k8s_ns_scope_exist() {
    local __resultvar=$1
    ELM_TYPE=$2
    ELM_NAME=$3
    ELM_NS=$4
    # Admin role
    unset CMD_LINE
    while read CMD_LINE ; do 
        K8S_NAME=`echo "$CMD_LINE" | cut -d' ' -f 1`
        if [ "$K8S_NAME" == "mdos-admin-role" ]; then
            ELM_EXISTS=1
        fi
    done < <($kubectl get $ELM_TYPE -n $ELM_NS 2>/dev/null)

    if [ -z $ELM_EXISTS ]; then
        eval $__resultvar=""
    else
        eval $__resultvar="1"
    fi
}

k8s_cluster_scope_exist() {
    local __resultvar=$1
    ELM_TYPE=$2
    ELM_NAME=$3
    # Admin role
    unset CMD_LINE
    while read CMD_LINE ; do 
        K8S_NAME=`echo "$CMD_LINE" | cut -d' ' -f 1`
        if [ "$K8S_NAME" == "mdos-admin-role" ]; then
            ELM_EXISTS=1
        fi
    done < <($kubectl get $ELM_TYPE 2>/dev/null)

    if [ -z $ELM_EXISTS ]; then
        eval $__resultvar=""
    else
        eval $__resultvar="1"
    fi
}

wait_all_ns_pods_healthy() {
    # Wait for all pods to be on
    unset TARGET_IS_RUNNING
    while [ -z $TARGET_IS_RUNNING ]; do
        unset ANY_ERRORS
        while read TARGET_POD_LINE ; do 
            TARGET_POD_STATUS=`echo "$TARGET_POD_LINE" | awk 'END {print $3}'`
            if [ "$TARGET_POD_STATUS" != "STATUS" ] && [ "$TARGET_POD_STATUS" != "Running" ]; then
                ANY_ERRORS=1
            fi
        done < <($kubectl get pod -n $1 2>/dev/null)
        if [ -z $ANY_ERRORS ]; then
            TARGET_IS_RUNNING=1
        else
            sleep 2
        fi
    done
}