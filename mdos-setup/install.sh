#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

# ############################################
# ############## CHECKS & INIT ###############
# ############################################

if [ "$EUID" -ne 0 ]
    then echo "Please run as root"
    exit 1
fi

source ./lib/components.sh
source ./lib/helpers.sh

clear
echo '
  __  __ ___   ___  ___   ___ _  _ ___ _____ _   _    _    
 |  \/  |   \ / _ \/ __| |_ _| \| / __|_   _/_\ | |  | |   
 | |\/| | |) | (_) \__ \  | || .` \__ \ | |/ _ \| |__| |__ 
 |_|  |_|___/ \___/|___/ |___|_|\_|___/ |_/_/ \_\____|____|
                                                           
'     

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

LOG_FILE="$HOME/$(date +'%m_%d_%Y_%H_%M_%S')_mdos_install.log"

# Parse user input
while [ "$1" != "" ]; do
    case $1 in
        --reset )
            rm -rf $HOME/.mdos
        ;;
        * ) error "Invalid parameter detected: $1"
            exit 1
    esac
    shift
done

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
    fi
else
    warn "Configure your firewall to allow traffic on port 0.0.0.0:22, 0.0.0.0:30979 and 192.168.0.0/16:8080"
fi

# LOAD INSTALLATION TRACKING LOGS
INST_ENV_PATH="$HOME/.mdos/install.dat"
mkdir -p "$HOME/.mdos"
if [ -f $INST_ENV_PATH ]; then
    source $INST_ENV_PATH
else
    touch $HOME/.mdos/install.dat
fi

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
                -n $I_NS 1>/dev/null
        fi
    fi

    helm upgrade --install $I_APP ./dep/mhc-generic/chart \
        --values ./target_values.yaml \
        -n $I_NS --atomic 1> /dev/null
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

# ############################################
# ############# COLLECT USER DATA ############
# ############################################
collect_user_input() {
    pathRe='^/[A-Za-z0-9/_-]+$'

    # COLLECT ADMIN CREDS
    print_section_title "Admin user account"
    user_input KEYCLOAK_USER "Enter a admin username for the platform:"
    user_input KUBE_ADMIN_EMAIL "Enter the admin email address for the default keycloak client user:"
    user_input KEYCLOAK_PASS "Enter a admin password for the platform:"

    # CERT MODE
    print_section_title "Domain name and certificate"
    OPTIONS_STRING="You already have a certificate and a wild card domain;You have a Cloudflare domain, but no certificates;Generate and use self signed, do not have a domain"
    OPTIONS_VALUES=("SSL_PROVIDED" "CLOUDFLARE" "SELF_SIGNED")
    set +Ee
    prompt_for_select CMD_SELECT "$OPTIONS_STRING"
    set -Ee
    for i in "${!CMD_SELECT[@]}"; do
        if [ "${CMD_SELECT[$i]}" == "true" ]; then
            CERT_MODE="${OPTIONS_VALUES[$i]}"
        fi
    done

    # PREPARE CERTIFICATES & DOMAIN
    if [ "$CERT_MODE" == "CLOUDFLARE" ]; then
        user_input DOMAIN "Enter your DNS root domain name (ex. mydomain.com):" 
        user_input CF_EMAIL "Enter your Cloudflare account email:"
        user_input CF_TOKEN "Enter your Cloudflare API token:"
    elif [ "$CERT_MODE" == "SELF_SIGNED" ]; then
        user_input DOMAIN "Enter your DNS root domain name (ex. mydomain.com):" 
        set +Ee
        yes_no DNS_RESOLVABLE "Is your domain \"$DOMAIN\" resolvable through a public or private DNS server?"
        set -Ee
        if [ "$DNS_RESOLVABLE" == "no" ]; then
            context_print "MDos will need to know how to reach it's FTP server from within the"
            context_print "cluster without DNS resolution. An IP address is therefore required."
            echo ""

            unset LOOP_BREAK
            while [ -z $LOOP_BREAK ]; do
                user_input NODNS_LOCAL_IP "Please enter the local IP address for this machine:"
                if [[ $NODNS_LOCAL_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                    LOOP_BREAK=1
                else
                    error "Invalid IP address"
                fi
            done
        fi
    else
        warn "Not implemented yet!"
        exit 1
    fi

    # LONGHORN
    print_section_title "Kubernetes Storage"
    context_print "MDos uses Longhorn as the primary storage class for your Kubernetes workload data volumes."
    context_print "You can use Longhorn's default storage folder for this (/var/lib/longhorn), or specify"
    context_print "your own folder path in case you want to mount a external disk as the storage target for"
    context_print "your platform storage needs."
    echo ""
    set +Ee
    yes_no CUSTOM_LH_PATH "Would you like to customize the directory path used by longhorn to mount your filesystems at?" 1
    set -Ee

    if [ "$CUSTOM_LH_PATH" == "yes" ]; then
        unset LOOP_BREAK
        while [ -z $LOOP_BREAK ]; do
            user_input LONGHORN_DEFAULT_DIR "Specify the path where you wish to store your cluster storage data at (absolute path):"
            if [[ ${LONGHORN_DEFAULT_DIR} =~ $pathRe ]]; then
                LOOP_BREAK=1
            else
                error "Invalid folder path"
            fi
        done
        if [ ! -d $LONGHORN_DEFAULT_DIR ]; then
            warn "This directory path does not exist."
            set +Ee
            yes_no CREATE_LG_PATH "Would you like to create this folder?"
            set -Ee
            if [ "$CREATE_LG_PATH" == "yes" ]; then
                mkdir -p $LONGHORN_DEFAULT_DIR
            else
                exit 1
            fi
        fi
    fi

    # REGISTRY
    print_section_title "Private registry"
    if [ -z $REGISTRY_SIZE ]; then
        context_print "MDos provides you with a private registry that you can use to store your application"
        context_print "images on. This registry is shared amongst all tenants on your cluster (ACL is"
        context_print "implemented to protect tenant specific images)."
        echo ""
        user_input REGISTRY_SIZE "How many Gi (Gigabytes) do you want to allocate to your registry volume:"
        re='^[0-9]+$'
        while ! [[ $REGISTRY_SIZE =~ $re ]] ; do
            error "Invalide number, ingeger representing Gigabytes is expected"
            user_input REGISTRY_SIZE "How many Gi do you want to allocate to your registry volume:"
        done
    fi

    # FTP
    print_section_title "FTP volume sync server"
    context_print "Users will be able to easiely synchronize / mirror their static datasets with application"
    context_print "during deployments. This requires that the data is stored on the MDos platform so that"
    context_print "the user who deploys his/her applications can synchronize that data with the platform"
    context_print "upfront. Once done, the deploying application can automatically update / mirror those"
    context_print "changes to your PODs before your application actually starts."
    context_print "Please note that this data will remain on the MDos platform until the namespace / tenant"
    context_print "is deleted, or that you explicitely requested a volume folder to be deleted."
    context_print "Keeping the data available enables you to easiely do delta sync operations iteratively"
    context_print "without having to upload it all every time you change your datasets."
    context_print "You can store this buffered data on any partition folder you like."
    echo ""

    unset LOOP_BREAK
    while [ -z $LOOP_BREAK ]; do
        user_input FTP_DATA_HOME "Enter a full path to use to store all tenant/namespace volume data for synchronization purposes:"
        if [[ ${FTP_DATA_HOME} =~ $pathRe ]]; then
            LOOP_BREAK=1
        else
            error "Invalid folder path"
        fi
    done
    if [ ! -d $FTP_DATA_HOME ]; then
        warn "This directory path does not exist."
        set +Ee
        yes_no CREATE_FTP_PATH "Would you like to create this folder?"
        set -Ee
        if [ "$CREATE_FTP_PATH" == "yes" ]; then
            mkdir -p $FTP_DATA_HOME
        else
            exit 1
        fi
    fi
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
            lsb-release -y &>> $LOG_FILE
        snap install yq &>> $LOG_FILE

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

# ############################################
# ########### CLOUDFLARE & CERTBOT ###########
# ############################################
setup_cloudflare_certbot() {
    
    if [ "$PSYSTEM" == "APT" ]; then
        # Install certbot
        apt-get install certbot python3-certbot-dns-cloudflare -y &>> $LOG_FILE
    fi

    # Create cloudflare credentials file
    echo "dns_cloudflare_email = $CF_EMAIL" > $HOME/.mdos/cloudflare.ini
    echo "dns_cloudflare_api_key = $CF_TOKEN" >> $HOME/.mdos/cloudflare.ini

    echo "dns_cloudflare_email = mdundek@gmail.com" > $HOME/.mdos/cloudflare.ini
    echo "dns_cloudflare_api_key = fe5beef86732475a7073b122139f64f9f49ee" >> $HOME/.mdos/cloudflare.ini

    # Create certificate now (will require manual input)
    if [ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
        question "Please run the following command in a separate terminal on this machine to generate your valid certificate:"
        echo ""
        echo "sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials $HOME/.mdos/cloudflare.ini -d $DOMAIN -d *.$DOMAIN --email $CF_EMAIL --agree-tos -n"
        echo ""

        yes_no CERT_OK "Select 'yes' if the certificate has been generated successfully to continue the installation" 1
        
        if [ "$CERT_OK" == "yes" ]; then
            if [ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
                error "Could not find generated certificate under: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
                exit 1
            fi
            chmod 655 /etc/letsencrypt/archive/$DOMAIN/*.pem
        else
            warn "Aborting installation"
            exit 1
        fi
        
    fi

    if [ ! -f /var/spool/cron/crontabs/root ]; then
        # TODO: Need fixing if chrontab creation, opens editor and breaks install script
        yes_no CRON_OK "Please create a crontab for user 'root' in a separate terminal using the command: sudo crontab -e. Once done, select 'yes'" 1
        if [ "$CRON_OK" == "yes" ]; then
            if [ ! -f /var/spool/cron/crontabs/root ]; then
                error "Could not find root user crontab"
                exit 1
            fi
        else
            warn "Aborting installation"
            exit 1
        fi
    fi

    mkdir -p $HOME/.mdos/cron
    # Set up auto renewal of certificate (the script will be run as the user who created the crontab)
    cp $_DIR/dep/cron/91_renew_certbot.sh $HOME/.mdos/cron/91_renew_certbot.sh
    if [ "$(crontab -l | grep '91_renew_certbot.sh')" == "" ]; then
        (crontab -l 2>/dev/null; echo "5 8 * * * $HOME/.mdos/cron/91_renew_certbot.sh") | crontab -
    fi

    # Set up auto IP update on cloudflare (the script will be run as the user who created the crontab)
    cp $_DIR/dep/cron/90_update_ip_cloudflare.sh $HOME/.mdos/cron/90_update_ip_cloudflare.sh
    if [ "$(crontab -l | grep '90_update_ip_cloudflare.sh')" == "" ]; then
        yes_no IP_UPDATE "Do you want to update your DNS records with your public IP address automatically in case it is not static?" 1
        if [ "$IP_UPDATE" == "yes" ]; then
            (crontab -l 2>/dev/null; echo "5 6 * * * $HOME/.mdos/cron/90_update_ip_cloudflare.sh") | crontab -
        fi
    fi

    /etc/init.d/cron restart &>> $LOG_FILE
}

# ############################################
# ################# ETC_HOSTS ################
# ############################################
configure_etc_hosts() {
    if [ "$(cat /etc/hosts | grep registry.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 registry.$DOMAIN" >> /etc/hosts
    fi
    if [ "$(cat /etc/hosts | grep registry-auth.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 registry-auth.$DOMAIN" >> /etc/hosts
    fi
    if [ "$(cat /etc/hosts | grep keycloak.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 keycloak.$DOMAIN" >> /etc/hosts
    fi
    if [ "$(cat /etc/hosts | grep mdos-api.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 mdos-api.$DOMAIN" >> /etc/hosts
    fi
    if [ "$(cat /etc/hosts | grep mdos-ftp.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 mdos-ftp.$DOMAIN" >> /etc/hosts
    fi
    if [ "$(cat /etc/hosts | grep mdos-ftp-api.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 mdos-ftp-api.$DOMAIN" >> /etc/hosts
    fi
    if [ "$(cat /etc/hosts | grep longhorn.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 longhorn.$DOMAIN" >> /etc/hosts
    fi
}

# ############################################
# ######## GENERATE SELF SIGNED CERT #########
# ############################################
generate_selfsigned() {
    mkdir -p $SSL_ROOT

    # Create registry self signed certificate for local domain 
    echo "[req]
default_bits = 4096
default_md = sha256
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
C = FR
ST = HG
L = Toulouse
O = mdos
OU = mdos.home
CN = $DOMAIN
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN" > $SSL_ROOT/config.cfg
    /usr/bin/docker run --rm -v $SSL_ROOT:/export -i nginx:latest openssl req -new -nodes -x509 -days 365 -keyout /export/$DOMAIN.key -out /export/$DOMAIN.crt -config /export/config.cfg &>> $LOG_FILE

    cp $SSL_ROOT/$DOMAIN.key $SSL_ROOT/privkey.pem
    cp $SSL_ROOT/$DOMAIN.crt $SSL_ROOT/fullchain.pem
    chmod 655 $SSL_ROOT/*.pem
}

# ############################################
# ############### INSTALL K3S ################
# ############################################
install_k3s() {
    curl -sfL https://get.k3s.io | K3S_KUBECONFIG_MODE="644" INSTALL_K3S_EXEC="--flannel-backend=none --cluster-cidr=192.169.0.0/16 --disable-network-policy --disable=traefik --write-kubeconfig-mode=664" sh - &>> $LOG_FILE
    
    # Configure user K8S credentiald config file
    mkdir -p $HOME/.kube
    rm -rf $HOME/.kube/config
    cp /etc/rancher/k3s/k3s.yaml $HOME/.kube/config
    chmod 600 $HOME/.kube/config

    # Add kubectl permissions to all users as well
    getent passwd | while IFS=: read -r name password uid gid gecos home shell; do
        if [ -d "$home" ] && [ "$(stat -c %u "$home")" = "$uid" ] && [ "$home" == "/home/$name" ]; then
            mkdir -p $home/.kube
            cp /etc/rancher/k3s/k3s.yaml $home/.kube/config
            chown -R $name:$name $home/.kube
        fi
    done

    # Install Calico
    kubectl create -f https://projectcalico.docs.tigera.io/manifests/tigera-operator.yaml &>> $LOG_FILE
    cat <<EOF | k3s kubectl apply -f &>> $LOG_FILE -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 192.169.0.0/16
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
    containerIPForwarding: "Enabled"
---
apiVersion: operator.tigera.io/v1
kind: APIServer 
metadata: 
  name: default 
spec: {}
EOF

    info "Waiting for kubernetes to become ready..."
    ATTEMPTS=0
    while [ "$(kubectl get node | grep 'NotReady')" != "" ]; do
        sleep 3
        ATTEMPTS=$((ATTEMPTS+1))
        if [ "$ATTEMPTS" -gt 100 ]; then
            error "Timeout, Kubernetes did not come online, it is assumed there is a problem. Please check with the command kubectl get nodes and kubectl describe node <node name> for more information about the issue"
            exit 1
        fi
    done

    # Restart codedns to make sure external dns resolution works
    kubectl -n kube-system rollout restart deployment coredns &>> $LOG_FILE
    sleep 10
}

# ############################################
# ############# INSTALL LONGHORN #############
# ############################################
install_longhorn() {
    # Install storageclass
    helm repo add longhorn https://charts.longhorn.io &>> $LOG_FILE
    helm repo update &>> $LOG_FILE

    if [ "$CUSTOM_LH_PATH" == "yes" ]; then
        helm install longhorn longhorn/longhorn \
            --set service.ui.type=NodePort \
            --set service.ui.nodePort=30584 \
            --set persistence.defaultClassReplicaCount=2 \
            --set defaultSettings.guaranteedEngineManagerCPU=125m \
            --set defaultSettings.guaranteedReplicaManagerCPU=125m \
            --set defaultSettings.defaultDataPath=$LONGHORN_DEFAULT_DIR \
            --namespace longhorn-system --create-namespace --atomic &>> $LOG_FILE
    else
        helm install longhorn longhorn/longhorn \
            --set service.ui.type=NodePort \
            --set service.ui.nodePort=30584 \
            --set persistence.defaultClassReplicaCount=2 \
            --set defaultSettings.guaranteedEngineManagerCPU=125m \
            --set defaultSettings.guaranteedReplicaManagerCPU=125m \
            --namespace longhorn-system --create-namespace --atomic &>> $LOG_FILE
    fi
    
    sleep 10

    # Wait for all pods to be on
    wait_all_ns_pods_healthy "longhorn-system"

    # Create Virtual Service
    set +Ee
    while [ -z $VS_SUCCESS ]; do
        cat <<EOF | k3s kubectl apply -f &>> $LOG_FILE -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  labels:
    app: longhorn-ui
  name: longhorn-ui-ingress
  namespace: longhorn-system
spec:
  gateways:
  - istio-system/https-gateway
  hosts:
  - longhorn.$DOMAIN
  http:
  - name: longhorn-ui-ingress
    route:
    - destination:
        host: longhorn-frontend.longhorn-system.svc.cluster.local
        port:
          number: 80
EOF
        if [ $? -eq 0 ]; then
            VS_SUCCESS=1
        else
            sleep 2
        fi
    done
    set -Ee
}

# ############################################
# ############# PROTEECT LONGHORN ############
# ############################################
protect_longhorn() {
    cat <<EOF | k3s kubectl apply -f &>> $LOG_FILE -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  labels:
    app: longhorn-ui
  name: longhorn-ui-ingress
  namespace: longhorn-system
spec:
  gateways:
  - istio-system/https-gateway
  hosts:
  - longhorn.$DOMAIN
  http:
  - name: longhorn-ui-ingress
    route:
    - destination:
        host: longhorn-frontend.longhorn-system.svc.cluster.local
        port:
          number: 80
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  labels:
    app: longhorn-ui-ra
  name: longhorn-ui-ra
  namespace: longhorn-system
spec:
  jwtRules:
  - issuer: https://keycloak.$DOMAIN/realms/mdos
    jwksUri: https://keycloak.$DOMAIN/realms/mdos/protocol/openid-connect/certs
  selector:
    matchLabels:
      app: longhorn-ui

---

apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  labels:
    app: longhorn-ui-ap
  name: longhorn-ui-ap
  namespace: longhorn-system
spec:
  action: CUSTOM
  provider:
    name: kc-mdos
  rules:
  - to:
    - operation:
        hosts:
        - longhorn.$DOMAIN
  selector:
    matchLabels:
      app: longhorn-ui
EOF
}

# ############################################
# ############### INSTALL HELM ###############
# ############################################
install_helm() {
    if ! command -v helm &> /dev/null; then
        curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
        chmod 700 get_helm.sh
        ./get_helm.sh &>> $LOG_FILE
        rm -rf ./get_helm.sh
    fi
}

# ############################################
# ############### INSTALL ISTIO ##############
# ############################################
install_istio() {
    # Create namespace
    unset NS_EXISTS
    check_kube_namespace NS_EXISTS "istio-system"
    if [ -z $NS_EXISTS ]; then
        kubectl create namespace istio-system &>> $LOG_FILE
    fi

    # Install base istio components
    helm upgrade --install istio-base ./dep/istio_helm/base -n istio-system &>> $LOG_FILE

    echo "meshConfig:
  accessLogFile: /dev/stdout
  extensionProviders:
  - name: kc-mdos
    envoyExtAuthzHttp:
      service: kc-mdos-oauth2-proxy.oauth2-proxy.svc.cluster.local
      port: 4180
      includeRequestHeadersInCheck:
      - cookie
      - x-forwarded-access-token
      headersToUpstreamOnAllow:
      - authorization
      - cookie
      - path
      - x-auth-request-access-token
      - x-auth-request-user
      - x-auth-request-groups
      - x-auth-request-email
      - x-forwarded-access-token
      headersToDownstreamOnDeny:
      - set-cookie
      - content-type" > $_DIR/istiod-values.yaml
      
    helm upgrade --install istiod ./dep/istio_helm/istio-control/istio-discovery -f $_DIR/istiod-values.yaml -n istio-system &>> $LOG_FILE
    rm -rf $_DIR/istiod-values.yaml

    info "Waiting for istiod to become ready..."
    ATTEMPTS=0
    while [ "$(kubectl get pod -n istio-system | grep 'istiod-' | grep 'Running')" == "" ]; do
        sleep 3
        ATTEMPTS=$((ATTEMPTS+1))
        if [ "$ATTEMPTS" -gt 100 ]; then
            error "Timeout, Istio did not deploy in time. Please check with the command 'kubectl get pod -n istio-system' and 'kubectl describe pod <pod name> -n istio-system' for more information about the issue"
            exit 1
        fi
    done

    sed -i 's/type: LoadBalancer/type: NodePort/g' ./dep/istio_helm/gateways/istio-ingress/values.yaml
    sed -i 's/type: ClusterIP/type: NodePort/g' ./dep/istio_helm/gateways/istio-ingress/values.yaml
    helm upgrade --install istio-ingress ./dep/istio_helm/gateways/istio-ingress -n istio-system &>> $LOG_FILE

    info "Waiting for istio ingress gateway to become ready..."
    ATTEMPTS=0
    while [ "$(kubectl get pod -n istio-system | grep 'istio-ingressgateway-' | grep 'Running')" == "" ]; do
        sleep 3
        ATTEMPTS=$((ATTEMPTS+1))
        if [ "$ATTEMPTS" -gt 100 ]; then
            error "Timeout, Istio ingress gateway did not deploy in time. Please check with the command 'kubectl get pod -n istio-system' and 'kubectl describe pod <pod name> -n istio-system' for more information about the issue"
            exit 1
        fi
    done

    kubectl create -n istio-system secret tls httpbin-credential --key=$SSL_ROOT/privkey.pem --cert=$SSL_ROOT/fullchain.pem &>> $LOG_FILE

    ## Deploy Istio Gateways
    cat <<EOF | k3s kubectl apply -f &>> $LOG_FILE -
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: https-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "*.$DOMAIN"
    tls:
      mode: SIMPLE
      credentialName: httpbin-credential
---
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: https-gateway-mdos
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "registry.$DOMAIN"
    - "registry-auth.$DOMAIN"
    tls:
      mode: PASSTHROUGH
EOF

    # Wait for all pods to be on
    wait_all_ns_pods_healthy "istio-system"
}

# ############################################
# ############### INSTALL NGINX ##############
# ############################################
install_nginx() {
    info "Setting up NGinx..."

    if [ "$PSYSTEM" == "APT" ]; then
        apt install nginx -y &>> $LOG_FILE
        systemctl enable nginx &>> $LOG_FILE
        systemctl start nginx &>> $LOG_FILE
    fi

    if [ ! -f /etc/nginx/conf.d/mdos.conf ]; then
        cp ./dep/proxy/mdos.conf /etc/nginx/conf.d/

        sed -i "s/__DOMAIN__/$DOMAIN/g" /etc/nginx/conf.d/mdos.conf
        sed -i "s/__NODE_IP__/127.0.0.1/g" /etc/nginx/conf.d/mdos.conf
    fi

    # Enable firewall ports if necessary for NGinx port forwarding proxy to istio HTTPS ingress gateway
    if [ "$USE_FIREWALL" == "yes" ]; then
        if command -v ufw >/dev/null; then
            if [ "$(ufw status | grep 'HTTPS\|443' | grep 'ALLOW')" == "" ]; then
                ufw allow 443 &>> $LOG_FILE
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
        fi
    fi
    
    systemctl restart nginx &>> $LOG_FILE
}

# ############################################
# ############# INSTALL REGISTRY #############
# ############################################
install_registry() {
    # Create kubernetes namespace & secrets for registry
    unset NS_EXISTS
    check_kube_namespace NS_EXISTS "mdos-registry"
    if [ -z $NS_EXISTS ]; then
        kubectl create namespace mdos-registry &>> $LOG_FILE
    fi

    # Deploy registry
    deploy_reg_chart

    # Update docker and K3S registry for self signed cert
    if [ "$CERT_MODE" == "SELF_SIGNED" ]; then
        # Configure self signed cert with local docker deamon
        if [ ! -d /etc/docker/certs.d/registry.$DOMAIN ]; then
            mkdir -p /etc/docker/certs.d/registry.$DOMAIN
            cp $SSL_ROOT/fullchain.pem /etc/docker/certs.d/registry.$DOMAIN/ca.crt

            # Allow self signed cert registry for docker daemon
            echo "{
\"insecure-registries\" : [\"registry.$DOMAIN\"]
}" > ./daemon.json
            mv ./daemon.json /etc/docker/daemon.json
            service docker restart &>> $LOG_FILE
        fi

        # Prepare k3s registry SSL containerd config
        if [ ! -d /etc/rancher/k3s ]; then
            mkdir -p /etc/rancher/k3s
        fi

        if [ ! -f /etc/rancher/k3s/registries.yaml ]; then
            echo "mirrors:
  registry.$DOMAIN:
    endpoint:
    - \"https://registry.$DOMAIN\"
configs:
  \"registry.$DOMAIN\":
    auth:
      username: $KEYCLOAK_USER
      password: $KEYCLOAK_PASS
    tls:
      cert_file: $SSL_ROOT/fullchain.pem
      key_file: $SSL_ROOT/privkey.pem
      ca_file: $SSL_ROOT/fullchain.pem" > /etc/rancher/k3s/registries.yaml
            systemctl restart k3s &>> $LOG_FILE
        fi
    fi

    # Wait for all pods to be on
    sleep 5
    wait_all_ns_pods_healthy "mdos-registry"
    sleep 15
}

deploy_reg_chart() {
    REG_VALUES="$(cat ./dep/registry/values.yaml)"

    REG_VALUES=$(echo "$REG_VALUES" | yq '.components[0].ingress[0].matchHost = "registry.'$DOMAIN'"')
    REG_VALUES=$(echo "$REG_VALUES" | yq '.components[0].secrets[0].entries[0].value = "'"$(< $SSL_ROOT/fullchain.pem)"'"')
    REG_VALUES=$(echo "$REG_VALUES" | yq '.components[0].secrets[0].entries[1].value = "'"$(< $SSL_ROOT/privkey.pem)"'"')
    REG_VALUES=$(echo "$REG_VALUES" | yq '.components[1].ingress[0].matchHost = "registry-auth.'$DOMAIN'"')
    REG_VALUES=$(echo "$REG_VALUES" | yq '.components[1].secrets[0].entries[0].value = "'"$(< $SSL_ROOT/fullchain.pem)"'"')
    REG_VALUES=$(echo "$REG_VALUES" | yq '.components[1].secrets[0].entries[1].value = "'"$(< $SSL_ROOT/privkey.pem)"'"')
    REG_VALUES=$(echo "$REG_VALUES" | yq '.components[0].volumes[0].size = "'$REGISTRY_SIZE'Gi"')
    REG_VALUES=$(echo "$REG_VALUES" | yq '.components[0].configs[0].entries[2].value = "https://registry-auth.'$DOMAIN'/auth"')

    if [ ! -z $NODNS_LOCAL_IP ]; then
        REG_VALUES=$(echo "$REG_VALUES" | yq '.components[0].hostAliases[0].ip = "'$NODNS_LOCAL_IP'"')
        REG_VALUES=$(echo "$REG_VALUES" | yq '.components[0].hostAliases[0].hostNames[0] = "registry-auth.'$DOMAIN'"')
    else
        REG_VALUES=$(echo "$REG_VALUES" | yq eval 'del(.components[0].hostAliases)')
    fi

    # AUTHENTICATION SCRIPT
    if [ -z $1 ]; then # No auth
        echo "#!/bin/sh
read u p
exit 0" > ./authentication.sh
    else # Auth
        cat > ./authentication.sh <<EOL
#!/bin/sh
read u p
if [ -z \"\$u\" ]; then
    exit 0
else
    MDOS_URL=\"http://mdos-api-http.mdos:3030\"
    MDOS_HEAD=\"\$(wget -S --spider \$MDOS_URL 2>&1 | grep 'HTTP/1.1 200 OK')\"
    if [ \"\$MDOS_HEAD\" == \"\" ]; then
        exit 0
    else
        BCREDS=\$(echo '{ \"username\": \"'\$u'\", \"password\": \"'\$p'\" }' | base64 -w 0)
        RESULT=\$(wget -O- --header=\"Accept-Encoding: gzip, deflate\" http://mdos-api-http.mdos:3030/reg-authentication?creds=\$BCREDS)
        if [ \$? -ne 0 ]; then
                exit 1
        else
                exit 0
        fi
    fi
fi
EOL

    fi
    REG_VALUES=$(echo "$REG_VALUES" | yq '.components[1].configs[1].entries[0].value = "'"$(< ./authentication.sh)"'"')
    rm -rf ./authentication.sh

    # AUTHORIZATION SCRIPT
    if [ -z $1 ]; then # No auth
        echo "#!/bin/sh
read a
exit 0" > ./authorization.sh
    else # auth
        cat > ./authorization.sh <<EOL
#!/bin/sh
read a

MDOS_URL=\"http://mdos-api-http.mdos:3030\"
MDOS_HEAD=\"\$(wget -S --spider \$MDOS_URL 2>&1 | grep 'HTTP/1.1 200 OK')\"
if [ \"\$MDOS_HEAD\" == \"\" ]; then
    exit 0
else
    BCREDS=\$(echo \"\$a\" | base64 -w 0)
    RESULT=\$(wget -O- --header=\"Accept-Encoding: gzip, deflate\" http://mdos-api-http.mdos:3030/reg-authorization?data=\$BCREDS)
    if [ \$? -ne 0 ]; then
        exit 1
    else
        exit 0
    fi
fi
EOL
    fi
    REG_VALUES=$(echo "$REG_VALUES" | yq '.components[1].configs[1].entries[1].value = "'"$(< ./authorization.sh)"'"')
    rm -rf ./authorization.sh

    printf "$REG_VALUES\n" > ./target_values.yaml
    mdos_deploy_app "false" "false"
    rm -rf ./target_values.yaml
}

# ############################################
# ################# KEYCLOAK #################
# ############################################
install_keycloak() {
    # Create keycloak namespace & secrets for registry
    unset NS_EXISTS
    check_kube_namespace NS_EXISTS "keycloak"
    if [ -z $NS_EXISTS ]; then
        kubectl create namespace keycloak &>> $LOG_FILE
    fi

    # Compute remaining parameters
    POSTGRES_USER=$KEYCLOAK_USER
    POSTGRES_PASSWORD=$KEYCLOAK_PASS
    KEYCLOAK_DB_SCRIPT_MOUNT=$(pwd)/dep/keycloak/pg-init-scripts
    
    # Create / update keycloak values.yaml file
    KEYCLOAK_VAL=$(cat ./dep/keycloak/values.yaml)

    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.registry = "registry.'$DOMAIN'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.mdosRegistry = "registry.'$DOMAIN'"')

    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[0].secrets[0].entries[0].value = "'$POSTGRES_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[0].secrets[0].entries[1].value = "'$POSTGRES_PASSWORD'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[0].secrets[0].entries[2].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[0].secrets[0].entries[3].value = "'$KEYCLOAK_PASS'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[0].volumes[1].hostPath = "'$KEYCLOAK_DB_SCRIPT_MOUNT'"')

    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[1].secrets[0].entries[0].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[1].secrets[0].entries[1].value = "'$KEYCLOAK_PASS'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[1].secrets[0].entries[2].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[1].secrets[0].entries[3].value = "'$KEYCLOAK_PASS'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[1].secrets[1].entries[0].value = "'"$(< $SSL_ROOT/fullchain.pem)"'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.components[1].secrets[1].entries[1].value = "'"$(< $SSL_ROOT/privkey.pem)"'"')

    collect_api_key() {
        echo ""
        question "To finalyze the setup, do the following:"
        echo ""
        echo "  1. Open a browser and go to:"
        warn_print "     https://keycloak.$DOMAIN/admin/master/console/#/realms/master/clients"
        echo "  2. From the 'Clients' section, click on the client 'master-realm'"
        echo "  3. Change 'Access Type' value to 'confidential'"
        echo "  4. Enable the boolean value 'Service Accounts Enabled'"
        echo "  5. Set 'Valid Redirect URIs' value to '*'"
        echo "  6. Save those changes (button at the bottom of the page)"
        echo "  7. In tab 'Roles', Click on button 'edit' for role 'magage realm'."
        echo "     Enable 'Composite roles' and add 'admin' realm to associated roles"
        echo "  8. Go to the 'Service Account Roles' tab and add the role 'admin' to the 'Assigned Roles' box"
        echo "  9. Click on tab 'Credentials'"
        echo " 10. When ready, copy and paste the 'Secret' value into this terminal, then press enter:"
        echo ""
        user_input KEYCLOAK_SECRET "SECRET:"
        echo ""
    } 

    gen_api_token() {
        KC_TOKEN=$(curl -s -k -X POST \
            "https://keycloak.$DOMAIN/realms/master/protocol/openid-connect/token" \
            -H "Content-Type: application/x-www-form-urlencoded"  \
            -d "grant_type=client_credentials" \
            -d "client_id=master-realm" \
            -d "client_secret=$KEYCLOAK_SECRET" \
            -d "username=$KEYCLOAK_USER"  \
            -d "password=$KEYCLOAK_PASS" \
            -d "scope=openid" | jq -r '.access_token')
    }

    setup_keycloak_mdos_realm() {
        # Create mdos realm
        curl -k -s --request POST \
            https://keycloak.$DOMAIN/admin/realms \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            -d '{"id": "'$REALM'","realm": "'$REALM'","rememberMe": true, "enabled": true}'

        # Create mdos client
        gen_api_token
        curl -k -s --request POST \
            https://keycloak.$DOMAIN/admin/realms/$REALM/clients \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            --data-raw '{
                "clientId": "'$CLIENT_ID'",
                "rootUrl": "",
                "baseUrl": "",
                "surrogateAuthRequired": false,
                "enabled": true,
                "alwaysDisplayInConsole": false,
                "clientAuthenticatorType": "client-secret",
                "redirectUris": [
                    "*"
                ],
                "webOrigins": [],
                "notBefore": 0,
                "bearerOnly": false,
                "consentRequired": false,
                "standardFlowEnabled": true,
                "implicitFlowEnabled": false,
                "directAccessGrantsEnabled": true,
                "serviceAccountsEnabled": true,
                "authorizationServicesEnabled": true,
                "publicClient": false,
                "frontchannelLogout": false,
                "protocol": "openid-connect",
                "fullScopeAllowed": true,
                "defaultClientScopes": [
                    "web-origins",
                    "acr",
                    "profile",
                    "roles",
                    "email"
                ],
                "optionalClientScopes": [
                    "address",
                    "phone",
                    "offline_access",
                    "microprofile-jwt"
                ],
                "access": {
                    "view": true,
                    "configure": true,
                    "manage": true
                }
            }'

        # Get mdos client UUID
        gen_api_token
        MDOS_CLIENT_UUID=$(curl -s -k --request GET \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            https://keycloak.$DOMAIN/admin/realms/$REALM/clients?clientId=$CLIENT_ID | jq '.[0].id' | sed 's/[\"]//g')

        # Get mdos client secret
        MDOS_CLIENT_SECRET=$(curl -k -s --location --request GET \
            https://keycloak.$DOMAIN/admin/realms/$REALM/clients/$MDOS_CLIENT_UUID/client-secret \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" | jq '.value' | sed 's/[\"]//g')

        # Create admin user
        gen_api_token
        curl -k -s --request POST \
            https://keycloak.$DOMAIN/admin/realms/$REALM/users \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            --data-raw '{
                "username": "'$KEYCLOAK_USER'",
                "enabled": true,
                "totp": false,
                "emailVerified": true,
                "email": "'$KUBE_ADMIN_EMAIL'",
                "disableableCredentialTypes": [],
                "requiredActions": [],
                "notBefore": 0,
                "access": {
                    "manageGroupMembership": true,
                    "view": true,
                    "mapRoles": true,
                    "impersonate": true,
                    "manage": true
                }
            }'

        # Get admin user UUID
        gen_api_token
        MDOS_USER_UUID=$(curl -k -s --location --request GET \
            https://keycloak.$DOMAIN/admin/realms/$REALM/users \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" | jq '.[0].id' | sed 's/[\"]//g')

        # Set admin user password
        curl -s -k --request PUT \
            https://keycloak.$DOMAIN/admin/realms/$REALM/users/$MDOS_USER_UUID/reset-password \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            --data-raw '{"type":"password","value":"'$KEYCLOAK_PASS'","temporary":false}'

        # -=-=-=-=-=- Create client roles -=-=-=-=-=-
        createMdosRole() {
            # Create mdos admin role
            gen_api_token
            curl -s -k --request POST \
                -H "Accept: application/json" \
                -H "Content-Type:application/json" \
                -H "Authorization: Bearer $KC_TOKEN" \
                -d '{"id": "'$1'", "name": "'$1'", "clientRole": true}' \
                https://keycloak.$DOMAIN/admin/realms/$REALM/clients/$MDOS_CLIENT_UUID/roles

            # Create client role mapping for mdos admin user
            if [ ! -z $2 ]; then
                gen_api_token

                # Get mdos admin role UUID
                ROLE_UUID=$(curl -s -k --request GET \
                    -H "Accept: application/json" \
                    -H "Content-Type:application/json" \
                    -H "Authorization: Bearer $KC_TOKEN" \
                    https://keycloak.$DOMAIN/admin/realms/$REALM/clients/$MDOS_CLIENT_UUID/roles/$1 | jq '.id' | sed 's/[\"]//g')

                curl -s -k --request POST \
                    -H "Accept: application/json" \
                    -H "Content-Type:application/json" \
                    -H "Authorization: Bearer $KC_TOKEN" \
                    -d '[{"id":"'$ROLE_UUID'","name":"'$1'"}]' \
                    https://keycloak.$DOMAIN/admin/realms/$REALM/users/$2/role-mappings/clients/$MDOS_CLIENT_UUID
            fi
        }

        # Create all roles, assign admin role to admin user for mdos client
        createMdosRole "admin" $MDOS_USER_UUID
        createMdosRole "create-namespace"
        createMdosRole "list-namespaces"
        createMdosRole "delete-namespace"
        createMdosRole "create-users"
        createMdosRole "list-users"
        createMdosRole "delete-users"
        createMdosRole "create-roles"
        createMdosRole "delete-roles"
        createMdosRole "assign-roles"
        createMdosRole "oidc-create"
        createMdosRole "oidc-remove"

        # Create secret with credentials
        cat <<EOF | k3s kubectl apply -f &>> $LOG_FILE -
apiVersion: v1
kind: Secret
metadata:
  name: admin-creds
  namespace: keycloak
type: Opaque
stringData:
  clientSecret: $KEYCLOAK_SECRET
  email: $KUBE_ADMIN_EMAIL
  password: $KEYCLOAK_PASS
  username: $KEYCLOAK_USER
EOF
    }

    echo "${KEYCLOAK_PASS}" | docker login registry.$DOMAIN --username ${KEYCLOAK_USER} --password-stdin &>> $LOG_FILE

    # Pull & push images to registry
    docker pull postgres:13.2-alpine &>> $LOG_FILE
    docker tag postgres:13.2-alpine registry.$DOMAIN/postgres:13.2-alpine &>> $LOG_FILE

    # Registry might need some time to be up and ready, we therefore loop untill success for first push
    set +Ee
    PUSHING_DOCKER=1
    while [ -z $KC_PG_SUCCESS ]; do
        docker push registry.$DOMAIN/postgres:13.2-alpine &>> $LOG_FILE
        if [ $? -eq 0 ]; then
            KC_PG_SUCCESS=1
        else
            sleep 10
        fi
    done
    unset PUSHING_DOCKER
    set -Ee

    docker pull quay.io/keycloak/keycloak:18.0.2 &>> $LOG_FILE
    docker tag quay.io/keycloak/keycloak:18.0.2 registry.$DOMAIN/keycloak:18.0.2 &>> $LOG_FILE
    docker push registry.$DOMAIN/keycloak:18.0.2 &>> $LOG_FILE
    mkdir -p $HOME/.mdos/keycloak/db

    # Deploy keycloak
    printf "$KEYCLOAK_VAL\n" > ./target_values.yaml
    mdos_deploy_app "false" "true" &>> $LOG_FILE
    rm -rf ./target_values.yaml

    # Give it 2 secs to be up & running
    sleep 2

	# Configure API key
	collect_api_key
	gen_api_token
	setup_keycloak_mdos_realm
}


# ############################################
# ########### INSTALL OAUTH2-PROXY ###########
# ############################################
install_oauth2_proxy() {
    helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests &>> $LOG_FILE
    helm repo update &>> $LOG_FILE
    kubectl create ns oauth2-proxy &>> $LOG_FILE
    kubectl label ns oauth2-proxy istio-injection=enabled &>> $LOG_FILE

    echo "service:
  portNumber: 4180
config:
  clientID: \"$CLIENT_ID\"
  clientSecret: \"$MDOS_CLIENT_SECRET\"
  cookieSecret: \"$COOKIE_SECRET\"
  cookieName: \"_oauth2_proxy\"
  configFile: |-
    provider = \"oidc\"
    oidc_issuer_url=\"$OIDC_ISSUER_URL\"
    profile_url=\"$OIDC_USERINPUT_URI\"
    validate_url=\"$OIDC_USERINPUT_URI\"
    scope=\"openid email profile roles\"
    pass_host_header = true
    reverse_proxy = true
    auth_logging = true
    cookie_httponly = true
    cookie_refresh = \"4m\"
    cookie_secure = true
    email_domains = \"*\"
    pass_access_token = true
    pass_authorization_header = true
    request_logging = true
    session_store_type = \"cookie\"
    set_authorization_header = true
    set_xauthrequest = true
    silence_ping_logging = true
    skip_provider_button = true
    skip_auth_strip_headers = false
    skip_jwt_bearer_tokens = true
    ssl_insecure_skip_verify = true
    standard_logging = true
    upstreams = [ \"static://200\" ]
    whitelist_domains = [\".$DOMAIN\"]" > $_DIR/oauth2-proxy-values.yaml

    helm upgrade --install -n oauth2-proxy \
      --version 6.0.1 \
      --values $_DIR/oauth2-proxy-values.yaml \
      kc-mdos oauth2-proxy/oauth2-proxy --atomic &>> $LOG_FILE

    # Wait for all pods to be on
    sleep 5
    wait_all_ns_pods_healthy "oauth2-proxy"
}

# ############################################
# ############### INSTALL MDOS ###############
# ############################################
install_mdos() {
    # Build mdos-api image
    cd ../mdos-api
    echo "$KEYCLOAK_PASS" | docker login registry.$DOMAIN --username $KEYCLOAK_USER --password-stdin &>> $LOG_FILE
    cp infra/dep/helm/helm .
    DOCKER_BUILDKIT=1 docker build -t registry.$DOMAIN/mdos-api:latest . &>> $LOG_FILE
    rm -rf helm

    set +Ee
    PUSHING_DOCKER=1
    while [ -z $MDOS_API_PUSH_SUCCESS ]; do
        docker push registry.$DOMAIN/mdos-api:latest &>> $LOG_FILE
        if [ $? -eq 0 ]; then
            MDOS_API_PUSH_SUCCESS=1
        else
            sleep 10
        fi
    done
    unset PUSHING_DOCKER
    set -Ee

    # Build lftp image
    cd ../mdos-setup/dep/images/docker-mirror-lftp
    DOCKER_BUILDKIT=1 docker build -t registry.$DOMAIN/mdos-mirror-lftp:latest . &>> $LOG_FILE
    docker push registry.$DOMAIN/mdos-mirror-lftp:latest &>> $LOG_FILE
    cd ../../..

    # Now prepare deployment config
    k8s_cluster_scope_exist ELM_EXISTS ns "mdos"
    if [ -z $ELM_EXISTS ]; then
        kubectl create ns mdos &>> $LOG_FILE
        kubectl label ns mdos istio-injection=enabled &>> $LOG_FILE
    fi

    k8s_ns_scope_exist ELM_EXISTS secret "default" "mdos"
    if [ -z $ELM_EXISTS ]; then
cat <<EOF | kubectl create -f &>> $LOG_FILE -
apiVersion: v1
kind: Secret
metadata:
  name: default
  namespace: mdos
  annotations:
    kubernetes.io/service-account.name: "default"
type: kubernetes.io/service-account-token
EOF
    fi

    # Admin role
    k8s_cluster_scope_exist ELM_EXISTS clusterrole "mdos-admin-role"
    if [ -z $ELM_EXISTS ]; then
        cat <<EOF | kubectl create -f &>> $LOG_FILE -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: mdos-admin-role
rules:
- apiGroups:
  - '*'
  resources:
  - '*'
  verbs:
  - '*'
- nonResourceURLs:
  - '*'
  verbs:
  - '*'
EOF
    fi

    # Admin role binding
    k8s_cluster_scope_exist ELM_EXISTS clusterrolebinding "mdos-admin-role-binding"
    if [ -z $ELM_EXISTS ]; then
        cat <<EOF | kubectl create -f &>> $LOG_FILE -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: scds-admin-role-binding
roleRef:
  kind: ClusterRole
  name: mdos-admin-role
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: ServiceAccount
  name: default
  namespace: mdos
EOF
    fi

    # Deploy mdos-api server
    MDOS_VALUES="$(cat ./dep/mdos-api/values.yaml)"

    if [ "$CERT_MODE" == "SELF_SIGNED" ]; then
        K3S_REG_DOMAIN="registry.$DOMAIN"
        MDOS_VALUES=$(echo "$MDOS_VALUES" | yq eval 'del(.components[0].oidc)')
    else
        K3S_REG_DOMAIN="registry.$DOMAIN"
        MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].oidc.issuer = "'$OIDC_ISSUER_URL'"')
        MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].oidc.jwksUri = "'$OIDC_JWKS_URI'"')
        MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].oidc.hosts[0] = "mdos-api.'$DOMAIN'"')
    fi

    if [ ! -z $NODNS_LOCAL_IP ]; then
        MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].hostAliases[0].ip = "'$NODNS_LOCAL_IP'"')
        MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].hostAliases[0].hostNames[0] = "mdos-ftp-api.'$DOMAIN'"')
    else
        MDOS_VALUES=$(echo "$MDOS_VALUES" | yq eval 'del(.components[0].hostAliases)')
    fi

    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.registry = "'$K3S_REG_DOMAIN'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].ingress[0].matchHost = "mdos-api.'$DOMAIN'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].configs[0].entries[0].value = "'$DOMAIN'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].configs[0].entries[1].value = "/etc/letsencrypt/live/'$DOMAIN'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].secrets[0].entries[0].value = "'$KEYCLOAK_USER'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].secrets[0].entries[1].value = "'$KEYCLOAK_PASS'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].secrets[1].entries[0].value = "'"$(< /var/lib/rancher/k3s/server/tls/server-ca.crt)"'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].volumes[0].mountPath = "/etc/letsencrypt/live/'$DOMAIN'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].volumes[0].hostPath = "/etc/letsencrypt/live/'$DOMAIN'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].volumes[1].hostPath = "'$_DIR'/dep/mhc-generic/chart"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | yq '.components[0].volumes[2].hostPath = "'$_DIR'/dep/istio_helm/istio-control/istio-discovery"')
    
    printf "$MDOS_VALUES\n" > ./target_values.yaml

    mdos_deploy_app "true" "true"

    rm -rf ./target_values.yaml
}

# ############################################
# ############ COREDNS DOMAIN CFG ############
# ############################################
consigure_core_dns_for_self_signed() {
    echo "===> 1" &>> $LOG_FILE
    cat <<EOF | k3s kubectl apply -f &>> $LOG_FILE -
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  $DOMAIN.server: |
    $DOMAIN {
        errors
        health
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
          pods insecure
          fallthrough in-addr.arpa ip6.arpa
        }
        hosts /etc/coredns/NodeHosts {
          ttl 60
          reload 15s
          fallthrough
        }
        rewrite name registry.$DOMAIN registry-v2-https.mdos-registry.svc.cluster.local
        rewrite name registry-auth.$DOMAIN registry-auth-https.mdos-registry.svc.cluster.local
        rewrite name keycloak.$DOMAIN keycloak-keycloak-service.keycloak.svc.cluster.local
        rewrite name mdos-api.$DOMAIN mdos-api-http.mdos.svc.cluster.local
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
EOF
    echo "===> 2" &>> $LOG_FILE
    sleep 1
    # Restart the CoreDNS pod
    unset FOUND_RUNNING_POD
    while [ -z $FOUND_RUNNING_POD ]; do
        while read POD_LINE ; do 
            COREDNS_POD_NAME=`echo "$POD_LINE" | awk 'END {print $1}'`
            POD_STATUS=`echo "$POD_LINE" | awk 'END {print $3}'`
            if [ "$POD_STATUS" == "Running" ]; then
                FOUND_RUNNING_POD=1
            fi
        done < <(kubectl get pods -n kube-system | grep "coredns" 2>/dev/null)
        sleep 1
    done
    echo "===> 3" &>> $LOG_FILE
    kubectl delete pod $COREDNS_POD_NAME -n kube-system &>> $LOG_FILE
    sleep 2
    echo "===> 4" &>> $LOG_FILE
    unset FOUND_RUNNING_POD
    while [ -z $FOUND_RUNNING_POD ]; do
        while read POD_LINE ; do
            POD_STATUS=`echo "$POD_LINE" | awk 'END {print $3}'`
            if [ "$POD_STATUS" == "Running" ]; then
                FOUND_RUNNING_POD=1
            fi
        done < <(kubectl get pods -n kube-system | grep "coredns" 2>/dev/null)
        sleep 1
    done
    echo "===> 5" &>> $LOG_FILE
}

# ############################################
# ########### INSTALL HELM FTP REG ###########
# ############################################
install_helm_ftp() {
    C_DIR="$(pwd)"
    
    # Build mdos-api image
    cd ../mdos-ftp
    echo "$KEYCLOAK_PASS" | docker login registry.$DOMAIN --username $KEYCLOAK_USER --password-stdin &>> $LOG_FILE
    DOCKER_BUILDKIT=1 docker build -t registry.$DOMAIN/mdos-ftp-bot:latest . &>> $LOG_FILE

    set +Ee
    unset DKPUSH_SUCCESS
    PUSHING_DOCKER=1
    while [ -z $DKPUSH_SUCCESS ]; do
        docker push registry.$DOMAIN/mdos-ftp-bot:latest &>> $LOG_FILE
        if [ $? -eq 0 ]; then
            DKPUSH_SUCCESS=1
        else
            sleep 10
        fi
    done
    unset PUSHING_DOCKER
    set -Ee

    cd ../mdos-setup

    mkdir -p $HOME/.mdos/pure-ftpd/passwd
    cp ./dep/pure-ftpd/docker-compose.yaml $HOME/.mdos/pure-ftpd
    cd $HOME/.mdos/pure-ftpd

    FTP_DOCKER_COMPOSE_VAL="$(cat ./docker-compose.yaml)"
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | yq '.services.mdos_ftpd_server.image = "registry.'$DOMAIN'/mdos-ftp-bot:latest"')
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | yq '.services.mdos_ftpd_server.volumes[0] = "'$FTP_DATA_HOME':/home/ftp_data/"')
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | yq '.services.mdos_ftpd_server.volumes[1] = "'$HOME'/.mdos/pure-ftpd/passwd:/etc/pure-ftpd/passwd"')
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | yq '.services.mdos_ftpd_server.environment.M2M_USER = "'$KEYCLOAK_USER'"')
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | yq '.services.mdos_ftpd_server.environment.M2M_PASSWORD = "'$KEYCLOAK_PASS'"')
    
    if [ ! -z $NODNS_LOCAL_IP ]; then
        FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | yq '.services.mdos_ftpd_server.environment.PUBLICHOST = "'$NODNS_LOCAL_IP'"')
    else
        FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | yq '.services.mdos_ftpd_server.environment.PUBLICHOST = "mdos-ftp.'$DOMAIN'"')
    fi

    printf "$FTP_DOCKER_COMPOSE_VAL\n" > ./docker-compose.yaml

    docker compose up -d &>> $LOG_FILE

    cd $C_DIR
}


# ###########################################################################################################################
# ########################################################### MAIN ##########################################################
# ###########################################################################################################################
(
    set -Ee

    function _catch {
        if [ -z $PUSHING_DOCKER ]; then
            GLOBAL_ERROR=1
            # Rollback
            if [ -z $IN_CLEANUP ]; then
                echo ""
                error "An error occured"
                echo "=> ERROR OCCURED" &>> $LOG_FILE
            fi
        fi
    }

    function _finally {
        # Cleanup
        info "Cleaning up..."

        set +Ee
        IN_CLEANUP=1
        
        ALL_IMAGES="$(docker images)"

        if [ "$(echo "$ALL_IMAGES" | grep "nginx" | grep "latest" | awk '{print $1}')" == "nginx" ]; then
            docker rmi nginx:latest &>> $LOG_FILE
        fi

        rm -rf $_DIR/istiod-values.yaml
        rm -rf $_DIR/oauth2-proxy-values.yaml

        ALL_IMAGES="$(docker images)"

        if [ "$(echo "$ALL_IMAGES" | grep "registry.$DOMAIN/keycloak" | grep "18.0.2")" != "" ]; then
            docker rmi registry.$DOMAIN/keycloak:18.0.2 &>> $LOG_FILE
        fi

        if [ "$(echo "$ALL_IMAGES" | grep "registry.$DOMAIN/postgres" | grep "13.2-alpine")" != "" ]; then
            docker rmi registry.$DOMAIN/postgres:13.2-alpine &>> $LOG_FILE
        fi

        if [ "$(echo "$ALL_IMAGES" | grep "quay.io/keycloak/keycloak" | grep "18.0.2")" != "" ]; then
            docker rmi quay.io/keycloak/keycloak:18.0.2 &>> $LOG_FILE
        fi

        if [ "$(echo "$ALL_IMAGES" | grep "postgres" | grep "13.2-alpine" | awk '{print $1}')" != "" ]; then
            docker rmi postgres:13.2-alpine &>> $LOG_FILE
        fi

        if [ ! -z $MDOS_SUCCESS ]; then

            if [ -z $GLOBAL_ERROR ]; then
                echo ""
                echo "-------------------------------------------------------------------"
                echo ""
            fi
            if [ -z $GLOBAL_ERROR ] && [ "$CERT_MODE" == "SELF_SIGNED" ]; then
                warn "You choose to generate a self signed certificate for this installation."
                echo "      All certificates are located under the folder $SSL_ROOT."
                echo "      You can use those certificates to allow your external tools to"
                echo "      communicate with the platform (ex. docker)."
                echo ""
                echo "      Self-signed certificates also impose limitations, the most significant"
                echo "      one being the inability to use OIDC authentication. MDos will therefore"
                echo "      fall back to a developement mode and allow you to do direct login"
                echo "      requests over APIs instead. This is not secure and shoud not be used in"
                echo "      production environements."
                echo ""
                echo "      To talk to your platform from an environement other than this one, you will"
                echo "      also need to configure your 'hosts' file in that remote environement with"
                echo "      the following resolvers:"
                echo "          <MDOS_VM_IP> mdos-api.$DOMAIN"
                echo "          <MDOS_VM_IP> mdos-ftp.$DOMAIN"
                echo "          <MDOS_VM_IP> registry.$DOMAIN"
                echo "          <MDOS_VM_IP> registry-auth.$DOMAIN"
                echo "          <MDOS_VM_IP> keycloak.$DOMAIN"
                echo "          <MDOS_VM_IP> longhorn.$DOMAIN"
                echo ""
            fi
            if [ -z $GLOBAL_ERROR ]; then
                info "The following services are available on the platform:"
                echo "          - mdos-api.$DOMAIN"
                echo "          - mdos-ftp.$DOMAIN:3915"
                echo "          - registry.$DOMAIN"
                echo "          - registry-auth.$DOMAIN"
                echo "          - keycloak.$DOMAIN"
                echo "          - longhorn.$DOMAIN"
                echo ""
                echo "      You will have to allow inbound traffic on the following ports:"
                echo "          - 443 (HTTPS traffic)"
                echo "          - 3915:3920 (TCP - FTP PSV traffic)"
            fi
        fi

        note_print "Log details of the installation can be found here: $LOG_FILE"

        if [ -z $GLOBAL_ERROR ]; then
            info "Done!"
        fi
    }

    trap _catch ERR
    trap _finally EXIT

    # COLLECT USER DATA
    collect_user_input

    print_section_title "Installation"

    # ############### MAIN ################
    if [ -z $INST_STEP_DEPENDENCY ]; then
        info "Update system and install dependencies..."
        dependencies
        set_env_step_data "INST_STEP_DEPENDENCY" "1"
    fi

    # PREPARE CERTIFICATES & DOMAIN
    if [ "$CERT_MODE" == "CLOUDFLARE" ]; then
        SSL_ROOT=/etc/letsencrypt/live/$DOMAIN

        if [ -z $INST_STEP_CLOUDFLARE ]; then
            info "Certbot installation and setup..."
            setup_cloudflare_certbot
            set_env_step_data "INST_STEP_CLOUDFLARE" "1"
        fi
    elif [ "$CERT_MODE" == "SSL_PROVIDED" ]; then
        error "Not implemented yet"
        exit 1
    else
        SSL_ROOT=/etc/letsencrypt/live/$DOMAIN

        if [ -z $INST_STEP_SS_CERT ]; then
            info "Generating self signed certificate..."
            generate_selfsigned
            set_env_step_data "INST_STEP_SS_CERT" "1"
        fi

        configure_etc_hosts
    fi

    # INSTALL K3S
    if [ -z $INST_STEP_K3S ]; then
        info "Installing K3S..."
        install_k3s
        set_env_step_data "INST_STEP_K3S" "1"
    fi

    # IF SELF SIGNED, ADD CUSTOM CORE-DNS CONFIG
    if [ "$CERT_MODE" == "SELF_SIGNED" ]; then
        consigure_core_dns_for_self_signed
    fi

    # INSTALL HELM
    if [ -z $INST_STEP_HELM ]; then
        info "Installing HELM..."
        install_helm
        set_env_step_data "INST_STEP_HELM" "1"
    fi

    # INSTALL ISTIO
    if [ -z $INST_STEP_ISTIO ]; then
        info "Install Istio..."
        install_istio
        set_env_step_data "INST_STEP_ISTIO" "1"
    fi

    # INSTALL LONGHORN
    if [ -z $INST_STEP_LONGHORN ]; then
        info "Install Longhorn..."
        install_longhorn
        set_env_step_data "INST_STEP_LONGHORN" "1"
    fi

    # INSTALL PROXY
    if [ -z $INST_STEP_PROXY ]; then
        info "Install NGinx proxy..."
        install_nginx
        set_env_step_data "INST_STEP_PROXY" "1"
    fi

    # INSTALL REGISTRY
    if [ -z $INST_STEP_REGISTRY ]; then
        info "Install Registry..."
        install_registry
        set_env_step_data "INST_STEP_REGISTRY" "1"
    fi

    # INSTALL KEYCLOAK
    REALM="mdos"
    CLIENT_ID="mdos"
    if [ -z $INST_STEP_KEYCLOAK ]; then
        info "Install Keycloak..."
        install_keycloak
        set_env_step_data "MDOS_CLIENT_SECRET" "$MDOS_CLIENT_SECRET"
        set_env_step_data "INST_STEP_KEYCLOAK" "1"
    fi

    # LOAD OAUTH2 DATA
    if [ "$CERT_MODE" == "SELF_SIGNED" ]; then
        KC_NODEPORT=":30998"
        OIDC_DISCOVERY=$(curl -s -k "https://keycloak.${DOMAIN}${KC_NODEPORT}/realms/mdos/.well-known/openid-configuration")
        OIDC_ISSUER_URL=$(echo $OIDC_DISCOVERY | jq -r .issuer)
        OIDC_JWKS_URI=$(echo $OIDC_DISCOVERY | jq -r .jwks_uri) 
        OIDC_USERINPUT_URI=$(echo $OIDC_DISCOVERY | jq -r .userinfo_endpoint)
        COOKIE_SECRET=$(openssl rand -base64 32 | tr -- '+/' '-_')
       
        OIDC_ISSUER_URL=${OIDC_ISSUER_URL//$KC_NODEPORT/}
        OIDC_JWKS_URI=${OIDC_JWKS_URI//$KC_NODEPORT/}
        OIDC_USERINPUT_URI=${OIDC_USERINPUT_URI//$KC_NODEPORT/}
    else
        OIDC_DISCOVERY=$(curl -s -k "https://keycloak.$DOMAIN/realms/mdos/.well-known/openid-configuration")
        OIDC_ISSUER_URL=$(echo $OIDC_DISCOVERY | jq -r .issuer)
        OIDC_JWKS_URI=$(echo $OIDC_DISCOVERY | jq -r .jwks_uri) 
        OIDC_USERINPUT_URI=$(echo $OIDC_DISCOVERY | jq -r .userinfo_endpoint)
        COOKIE_SECRET=$(openssl rand -base64 32 | tr -- '+/' '-_')
    fi
    
    # INSTALL OAUTH2 PROXY
    if [ -z $INST_STEP_OAUTH ]; then
        info "Install OAuth2 proxy..."
        install_oauth2_proxy
        set_env_step_data "INST_STEP_OAUTH" "1"
    fi

    # PROTECT LONGHORN UI
    if [ -z $INST_STEP_LONGHORN_PROTECT ]; then
        info "Protect Longhorn UI..."
        protect_longhorn
        set_env_step_data "INST_STEP_LONGHORN_PROTECT" "1"
    fi

    # INSTALL MDOS
    if [ -z $INST_STEP_MDOS ]; then
        info "Install MDos API server..."
        install_mdos
    fi

    # INSTALL MDOS FTP
    if [ -z $INST_STEP_MDOS_FTP ]; then
        info "Install MDos FTP server..."
        install_helm_ftp
        set_env_step_data "INST_STEP_MDOS_FTP" "1"
    fi

    # ENABLE REGISTRY AUTH
    if [ -z $INST_STEP_REG_AUTH ]; then
        info "Enabeling MDos registry auth..."
        deploy_reg_chart 1
        set_env_step_data "INST_STEP_REG_AUTH" "1"
    fi

    MDOS_SUCCESS=1
)