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

echo '
  __  __ ___   ___  ___    ___ ___  ___  ___    ___ ___ _____   _____ ___ 
 |  \/  |   \ / _ \/ __|  / __/ _ \|   \| __|__/ __| __| _ \ \ / / __| _ \
 | |\/| | |) | (_) \__ \ | (_| (_) | |) | _|___\__ \ _||   /\ V /| _||   /
 |_|  |_|___/ \___/|___/  \___\___/|___/|___|  |___/___|_|_\ \_/ |___|_|_\
                                                                                                                                
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

LOG_FILE="$HOME/$(date +'%m_%d_%Y_%H_%M_%S')_mdos_codeserver_install.log"

# Parse user input
while [ "$1" != "" ]; do
    case $1 in
        --oidc-keycloak )
            OIDC_PROVIDER=keycloak
        ;;
        * ) error "Invalid parameter detected: $1"
            exit 1
    esac
    shift
done

if [ ! -z $OIDC_PROVIDER ] && [ "$OIDC_PROVIDER" != "keycloak" ]; then
    error "Unsupported OIDC provider: $OIDC_PROVIDER"
    exit 1
fi

# LOAD INSTALLATION TRACKING LOGS
INST_ENV_PATH="$HOME/.mdos/install.dat"
mkdir -p "$HOME/.mdos"
if [ -f $INST_ENV_PATH ]; then
    source $INST_ENV_PATH
else
    touch $HOME/.mdos/install.dat
fi

CS_VERSION="4.5.0"

# ############### UPDATE ENV DATA VALUE ################
set_env_step_data() {
    sed -i '/'$1'=/d' $INST_ENV_PATH
    echo "$1=$2" >> $INST_ENV_PATH
}

check_kube_namespace() {
    local __resultvar=$1
    while read K_LINE ; do 
        K_NAME=`echo "$K_LINE" | cut -d' ' -f 1`
        if [ "$K_NAME" == "$2" ]; then
            eval $__resultvar=1
        fi
    done < <(kubectl get ns 2>/dev/null)
}

# ############################################
# ################# ETC_HOSTS ################
# ############################################
configure_etc_hosts() {
    if [ "$(cat /etc/hosts | grep cs.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 cs.$DOMAIN" >> /etc/hosts
    fi
}

# ############################################
# ############### CODE SERVER ################
# ############################################
install_code_server() {
    # Collect information
    if [ -z $CS_USER ]; then
        user_input CS_USER "For which user do you want to install code-server for:" "root"
        set_env_step_data "CS_USER" "$CS_USER"
    fi

    if [ -z $LOCAL_IP ]; then
        if command -v getent >/dev/null; then
            if command -v ip >/dev/null; then
                # Get the default network interface in use to connect to the internet
                host_ip=$(getent ahosts "google.com" | awk '{print $1; exit}')
                INETINTERFACE=$(ip route get "$host_ip" | grep -Po '(?<=(dev ))(\S+)')
                LOC_IP=$(ip addr show $INETINTERFACE | grep "inet\b" | awk '{print $2}' | cut -d/ -f1)
            fi
        fi
        if [ -z $LOC_IP ]; then
            user_input LOCAL_IP "Enter the local machine IP address (used to join code-server on this host from within the cluster):"
        else
            user_input LOCAL_IP "Enter the local machine IP address (used to join code-server on this host from within the cluster):" "$LOC_IP"
        fi
        set_env_step_data "LOCAL_IP" "$LOCAL_IP"
    fi
    
    if [ "$CS_USER" == "root" ]; then
        CS_USER_HOME="$HOME"
    else
        CS_USER_HOME="/home/$CS_USER"
    fi

    # Install Code-server locally
    wget -q https://github.com/coder/code-server/releases/download/v$CS_VERSION/code-server-$CS_VERSION-linux-amd64.tar.gz
    tar -xf code-server-$CS_VERSION-linux-amd64.tar.gz &>> $LOG_FILE

    rm -rf $CS_USER_HOME/bin
    rm -rf $CS_USER_HOME/data

    mkdir -p $CS_USER_HOME/bin
    mkdir -p $CS_USER_HOME/data/
    mv code-server-$CS_VERSION-linux-amd64 $CS_USER_HOME/bin/
    mv $CS_USER_HOME/bin/code-server-$CS_VERSION-linux-amd64 $CS_USER_HOME/bin/code-server
    
    if [ "$CS_USER" != "root" ]; then
        chmod +x $CS_USER_HOME/bin/code-server/code-server
        chown -R $CS_USER:$CS_USER $CS_USER_HOME/bin/code-server
        chown $CS_USER:$CS_USER $CS_USER_HOME/data/
    fi

    rm -rf code-server-$CS_VERSION-linux-amd64.tar.gz

    # Configure CS startup service
    echo "[Unit]
Description=Code-Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$CS_USER_HOME
ExecStart=$CS_USER_HOME/bin/code-server/code-server --host 0.0.0.0 --user-data-dir $CS_USER_HOME/data --auth none
TimeoutStartSec=0
User=$CS_USER
RemainAfterExit=yes
Restart=always

[Install]
WantedBy=default.target" > /etc/systemd/system/code-server.service

    systemctl daemon-reload &>> $LOG_FILE
    systemctl enable code-server.service &>> $LOG_FILE

    systemctl start code-server.service &>> $LOG_FILE

    # Add firewall rule
    if command -v ufw >/dev/null; then
        if [ "$(ufw status | grep '8080' | grep 'ALLOW')" == "" ]; then
            ufw allow from 192.168.0.0/16 to any port 8080 &>> $LOG_FILE
        fi
    fi

    # Load nginx / code-server proxy image to registry
    echo "${REG_PASS}" | docker login registry.$DOMAIN --username ${REG_USER} --password-stdin &>> $LOG_FILE

    docker load < ./dep/code-server/code-server-nginx.tar &>> $LOG_FILE
    docker tag code-server-nginx:latest registry.$DOMAIN/code-server-nginx:latest
    docker push registry.$DOMAIN/code-server-nginx:latest

    # Create Code server endpoint to access it from within code-server namespace
    unset NS_EXISTS
    check_kube_namespace NS_EXISTS "code-server"
    if [ -z $NS_EXISTS ]; then
        kubectl create ns code-server &>> $LOG_FILE
        kubectl label ns code-server istio-injection=enabled &>> $LOG_FILE
    fi

    REG_CREDS=$(echo "$REG_CREDS_B64" | base64 --decode)
    kubectl create secret docker-registry \
            regcred \
            --docker-server=registry.$DOMAIN \
            --docker-username=$(echo "$REG_CREDS" | cut -d':' -f1) \
            --docker-password=$(echo "$REG_CREDS" | cut -d':' -f2) \
            -n code-server 1>/dev/null

	cat <<EOF | kubectl apply -f &>> $LOG_FILE -
apiVersion: v1
kind: Service
metadata:
  name: codeserver-service-egress
  namespace: code-server
  labels:
    app: code-server
spec:
   clusterIP: None
   ports:
   - protocol: TCP
     port: 8080
     targetPort: 8080
   type: ClusterIP
---
apiVersion: v1
kind: Endpoints
metadata:
  name: codeserver-service-egress
  namespace: code-server
  labels:
    app: code-server
subsets:
  - addresses:
    - ip: $LOCAL_IP
    ports:
      - port: 8080
EOF

if [ -z $OIDC_PROVIDER ]; then
    cat <<EOF | kubectl apply -f &>> $LOG_FILE -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: code-server
  namespace: code-server
  labels:
    app: code-server
spec:
  gateways:
  - mdos/https-gateway
  hosts:
  - cs.$DOMAIN
  http:
  - match:
    - port: 443
    route:
    - destination:
        host: codeserver-service-egress.code-server.svc.cluster.local
        port:
          number: 8080
EOF
else
    cat <<EOF | kubectl apply -f &>> $LOG_FILE -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: code-server-proxy
  namespace: code-server
  labels:
    app: code-server-proxy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: code-server-proxy
  template:
    metadata:
      labels:
        app: code-server-proxy
    spec:
      imagePullSecrets:
      - name: regcred
      containers:
      - name: code-server-proxy
        image: registry.$DOMAIN/code-server-nginx:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: code-server-proxy
  namespace: code-server
  labels:
    app: code-server-proxy
spec:
  ports:
  - name: http-code-server-proxy
    port: 80
    targetPort: 80
  selector:
    app: code-server-proxy
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: code-server-proxy
  namespace: code-server
  labels:
    app: code-server-proxy
spec:
  gateways:
  - mdos/https-gateway
  hosts:
  - cs.$DOMAIN
  http:
  - match:
    - port: 443
    route:
    - destination:
        host: code-server-proxy.code-server.svc.cluster.local
        port:
          number: 80
EOF
fi

if [ "$OIDC_PROVIDER" == "keycloak" ]; then
    # LOAD OAUTH2 DATA
    OIDC_DISCOVERY=$(curl "https://keycloak.$DOMAIN:30999/realms/mdos/.well-known/openid-configuration")
    OIDC_ISSUER_URL=$(echo $OIDC_DISCOVERY | jq -r .issuer)
    OIDC_JWKS_URI=$(echo $OIDC_DISCOVERY | jq -r .jwks_uri) 

    cat <<EOF | kubectl apply -f &>> $LOG_FILE -
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: oidc-code-server-ra
  namespace: code-server
spec:
  jwtRules:
  - issuer: $OIDC_ISSUER_URL
    jwksUri: $OIDC_JWKS_URI
  selector:
    matchLabels:
      app: code-server-proxy
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: oidc-code-server-ap
  namespace: code-server
spec:
  action: CUSTOM
  provider:
    name: kc-mdos
  rules:
  - to:
    - operation:
        hosts:
        - "cs.$DOMAIN"
  selector:
    matchLabels:
      app: code-server-proxy
EOF
fi
}


# ###########################################################################################################################
# ########################################################### MAIN ##########################################################
# ###########################################################################################################################
(
    set -Ee

    function _catch {
        GLOBAL_ERROR=1
        # Rollback
        echo ""
        error "An error occured"
        
    }

    function _finally {
        # Cleanup
        info "Cleaning up..."
        
        rm -rf code-server-$CS_VERSION-linux-amd64.tar.gz
        rm -rf code-server-$CS_VERSION-linux-amd64

        ALL_IMAGES="$(docker images)"

        if [ "$(echo "$ALL_IMAGES" | grep "code-server-nginx" | grep "latest")" != "" ]; then
            docker rmi code-server-nginx:latest &>> $LOG_FILE
        fi

        echo ""
       
        if [ -z $GLOBAL_ERROR ]; then
            info "The following services are available on the platform:"
            echo "        - cs.$DOMAIN"
            echo ""
        fi
       
        note_print "Log details of the nstallation can be found here: $LOG_FILE"

        if [ -z $GLOBAL_ERROR ]; then
            info "Done!"
        fi
    }

    trap _catch ERR
    trap _finally EXIT

    # ############### MAIN ################

    if [ "$CERT_MODE" == "SELF_SIGNED" ]; then
        configure_etc_hosts
    fi

    # INSTALL CODE-SERVER
    if [ -z $INST_STEP_CS ]; then
        info "Install Code-server..."
        echo ""
        install_code_server
        set_env_step_data "INST_STEP_CS" "1"
    fi
)