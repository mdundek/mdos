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
        yes_no USE_FIREWALL "Your firewall is currently disabled. Do you want to enable it now and configure the necessary ports for the platform?" 1
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
check_kube_resource() {
    local __resultvar=$1
    while read K_LINE ; do 
        K_NAME=`echo "$K_LINE" | cut -d' ' -f 1`
        if [ "$K_NAME" == "$4" ]; then
            eval $__resultvar=1
        fi
    done < <(kubectl get $2 -n $3 2>/dev/null)
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
        if [ ! -z $1 ]; then
            kubectl label ns $I_NS istio-injection=enabled &>> $LOG_FILE
        fi
    fi

    unset SECRET_EXISTS
    while read SECRET_LINE ; do 
        NS_NAME=`echo "$SECRET_LINE" | cut -d' ' -f 1`
        if [ "$NS_NAME" == "regcred" ]; then
            SECRET_EXISTS=1
        fi
    done < <(kubectl get secret -n $I_NS 2>/dev/null)

    if [ -z $SECRET_EXISTS ]; then
        REG_CREDS=$(echo "$REG_CREDS_B64" | base64 --decode)
        
        kubectl create secret docker-registry \
            regcred \
            --docker-server=registry.$DOMAIN \
            --docker-username=$(echo "$REG_CREDS" | cut -d':' -f1) \
            --docker-password=$(echo "$REG_CREDS" | cut -d':' -f2) \
            -n $I_NS 1>/dev/null
    fi

    STATIC_COMP_APPEND='{"skipNetworkIsolation": true,"imagePullSecrets": [{"name": "regcred"}],"isDaemonSet": false,"serviceAccount": {"create": false},"podAnnotations": {},"podSecurityContext": {},"securityContext": {},"waitForComponents": [],"logs": {"enabled": false},"autoscaling": {"enabled": false}}'
    STATIC_APP_APPEND='{"registry": "registry.'$DOMAIN'","enabled": true,"developement": false,"appInternalName": "'$I_APP'","nodeSelector":{},"tolerations":[],"affinity":{},"isMdosApp": true, "global": {"imagePullPolicy":"Always","config": [],"secrets": []}}'

    # Make copy of application values file to work with
    cp ./target_values.yaml ./values_merged.yaml

    # Declare App comp array
    APP_COMPONENTS=()

    # Load all application components from the file
    readarray appcomponents < <(cat values_merged.yaml | yq e -o=j -I=0 '.appComponents[]' )

    C_INDEX=0
    # Iterate over components
    for appComponent in "${appcomponents[@]}"; do
        COMP_NAME=$(echo "$appComponent" | jq -r '.name')
        
        # Appens what we need to this component
        COMP_UPD=$(cat values_merged.yaml | yq ".appComponents[$C_INDEX] + $STATIC_COMP_APPEND")

        # Store the updated component in our array
        APP_COMPONENTS+=("$COMP_UPD")

        # Increment index
        C_INDEX=$((C_INDEX+1))
    done

    C_INDEX=0
    # Iterate over components
    for appComponent in "${appcomponents[@]}"; do
        echo "$(cat values_merged.yaml | yq 'del(.appComponents[0])')" > ./values_merged.yaml

        # Increment index
        C_INDEX=$((C_INDEX+1))
    done

    # Put it all back together
    for appComponent in "${APP_COMPONENTS[@]}"; do
        APP_COMP_JSON=$(echo "$appComponent" | yq -o=json -I=0 '.')

        VALUES_UPD=$(cat values_merged.yaml | yq ".appComponents += $APP_COMP_JSON")
        echo "$VALUES_UPD" > values_merged.yaml
    done

    VALUES_UPD=$(cat values_merged.yaml | yq ". += $STATIC_APP_APPEND")
    echo "$VALUES_UPD" > values_merged.yaml

    helm upgrade --install $I_APP ./dep/generic-helm-chart \
        --values ./values_merged.yaml \
        -n $I_NS --atomic 1> /dev/null

    rm -rf ./values_merged.yaml
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

    if [ -z $CF_EMAIL ]; then
        user_input CF_EMAIL "Enter your Cloudflare account email:"
        set_env_step_data "CF_EMAIL" "$CF_EMAIL"
    fi
    
    if [ -z $CF_TOKEN ]; then
        user_input CF_TOKEN "Enter your Cloudflare API token:"
        set_env_step_data "CF_TOKEN" "$CF_TOKEN"
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
    if [ "$(cat /etc/hosts | grep keycloak.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 keycloak.$DOMAIN" >> /etc/hosts
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
    sleep 3
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
  - name: oauth2-proxy-mdos
    envoyExtAuthzHttp:
      service: oauth2-proxy-mdos.oauth2-proxy.svc.cluster.local
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
    tls:
      mode: PASSTHROUGH
EOF
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

    if [ ! -f /etc/nginx/conf.d/k3s.conf ]; then
        cp ./dep/proxy/k3s.conf /etc/nginx/conf.d/

        sed -i "s/__DOMAIN__/$DOMAIN/g" /etc/nginx/conf.d/k3s.conf
        sed -i "s/__NODE_IP__/127.0.0.1/g" /etc/nginx/conf.d/k3s.conf
    fi

    # Enable firewall ports if necessary for NGinx port forwarding proxy to istio HTTPS ingress gateway
    if [ "$USE_FIREWALL" == "yes" ]; then
        if command -v ufw >/dev/null; then
            if [ "$(ufw status | grep 'HTTPS\|443' | grep 'ALLOW')" == "" ]; then
                ufw allow 443 &>> $LOG_FILE
                echo ""
            fi
        fi
    fi
    
    systemctl restart nginx &>> $LOG_FILE
}

# ############################################
# ############# INSTALL REGISTRY #############
# ############################################
install_registry() {
    if [ -z $REG_USER ] || [ -z $REG_PASS ]; then
        echo ""
        user_input REG_USER "Enter a registry username:"
        user_input REG_PASS "Enter a registry password:"
        REG_CREDS_B64=$(echo -n "$REG_USER:$REG_PASS" | base64 -w 0)
        set_env_step_data "REG_USER" "$REG_USER"
        set_env_step_data "REG_PASS" "$REG_PASS"
        set_env_step_data "REG_CREDS_B64" "$REG_CREDS_B64"
    fi

    # Create credentials file for the registry
    if [ ! -z $HOME/.mdos/registry/auth/htpasswd ]; then
        mkdir -p $HOME/.mdos/registry/auth
        rm -rf $HOME/.mdos/registry/auth/htpasswd
        htpasswd -Bbn $REG_USER $REG_PASS > $HOME/.mdos/registry/auth/htpasswd
    fi

    # Create kubernetes namespace & secrets for registry
    unset NS_EXISTS
    check_kube_namespace NS_EXISTS "mdos-registry"
    if [ -z $NS_EXISTS ]; then
        kubectl create namespace mdos-registry &>> $LOG_FILE
        k3s kubectl create secret tls certs-secret --cert=$SSL_ROOT/fullchain.pem --key=$SSL_ROOT/privkey.pem -n mdos-registry &>> $LOG_FILE
        k3s kubectl create secret generic auth-secret --from-file=$HOME/.mdos/registry/auth/htpasswd -n mdos-registry &>> $LOG_FILE
    fi

    # Deploy registry on k3s
    cat <<EOF | k3s kubectl apply -n mdos-registry -f &>> $LOG_FILE -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mdos-registry-v2-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
  - ReadWriteOnce
  hostPath:
    path: $HOME/.mdos/registry/data
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mdos-registry-v2
  labels:
    app: mdos-registry-v2
spec:
  selector:
    matchLabels:
      app: mdos-registry-v2
  serviceName: mdos-registry-v2
  updateStrategy:
    type: RollingUpdate
  replicas: 1
  template:
    metadata:
      labels:
        app: mdos-registry-v2
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: mdos-registry-v2
        image: registry:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 5000
          protocol: TCP
        volumeMounts:
        - name: repo-vol
          mountPath: /var/lib/registry
        - name: certs-vol
          mountPath: "/certs"
          readOnly: true
        - name: auth-vol
          mountPath: "/auth"
          readOnly: true
        env:
        - name: REGISTRY_HTTP_ADDR
          value: "0.0.0.0:5000"
        - name: REGISTRY_AUTH
          value: "htpasswd"
        - name: REGISTRY_AUTH_HTPASSWD_REALM
          value: "Registry Realm"
        - name: REGISTRY_AUTH_HTPASSWD_PATH
          value: "/auth/htpasswd"
        - name: REGISTRY_HTTP_TLS_CERTIFICATE
          value: "/certs/tls.crt"
        - name: REGISTRY_HTTP_TLS_KEY
          value: "/certs/tls.key"
      volumes:
      - name: certs-vol
        secret:
          secretName: certs-secret
      - name: auth-vol
        secret:
          secretName: auth-secret
  volumeClaimTemplates:
  - metadata:
      name: repo-vol
    spec:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mdos-registry-v2
spec:
  selector:
    app: mdos-registry-v2
  ports:
    - port: 5000
      targetPort: 5000
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: mdos-registry
spec:
  hosts:
    - "registry.$DOMAIN"
  gateways:
    - istio-system/https-gateway-mdos
  tls:
  - match:
    - port: 443
      sniHosts:
      - "registry.$DOMAIN"
    route:
    - destination:
        host: mdos-registry-v2.mdos-registry.svc.cluster.local
        port:
          number: 5000
EOF

    # Wait untill registry is up and running
    info "Waiting for the registry to come online..."
    ATTEMPTS=0
    while [ "$(kubectl get pod mdos-registry-v2-0 -n mdos-registry | grep 'Running')" == "" ]; do
        sleep 3
        ATTEMPTS=$((ATTEMPTS+1))
        if [ "$ATTEMPTS" -gt 100 ]; then
            error "Timeout, the registry did not come online, it is assumed there is a problem. Please check with the command 'kubectl get pod' and 'kubectl describe pod <node name> -n mdos-registry' for more information about the issue"
            exit 1
        fi
    done

    # Update docker and K3S registry for self signed cert
    if [ "$CERT_MODE" == "SELF_SIGNED" ]; then
        # Configure self signed cert with local docker deamon
        mkdir -p /etc/docker/certs.d/registry.$DOMAIN
        cp $SSL_ROOT/fullchain.pem /etc/docker/certs.d/registry.$DOMAIN/ca.crt

        # Allow self signed cert registry for docker daemon
        echo "{
\"insecure-registries\" : [\"registry.$DOMAIN\"]
}" > ./daemon.json
        mv ./daemon.json /etc/docker/daemon.json
        service docker restart &>> $LOG_FILE

        # Prepare k3s registry SSL containerd config
        if [ ! -d /etc/rancher/k3s ]; then
            mkdir -p /etc/rancher/k3s
        fi
        echo "mirrors:
  registry.$DOMAIN:
    endpoint:
    - \"https://registry.$DOMAIN\"
configs:
  \"registry.$DOMAIN\":
    auth:
      username: $REG_USER
      password: $REG_PASS
    tls:
      cert_file: $SSL_ROOT/fullchain.pem
      key_file: $SSL_ROOT/privkey.pem
      ca_file: $SSL_ROOT/fullchain.pem" > /etc/rancher/k3s/registries.yaml

        systemctl restart k3s &>> $LOG_FILE
    fi
}

# ############################################
# ################### MINIO ##################
# ############################################
install_minio() {
    if [ -z $MINIO_ACCESS_KEY ]; then
        user_input MINIO_ACCESS_KEY "Specify your ACCESS_KEY:" "REp9k63uJ6qTe4KRtMsU" 
        set_env_step_data "MINIO_ACCESS_KEY" "$MINIO_ACCESS_KEY"
    fi
    if [ -z $MINIO_SECRET_KEY ]; then
        user_input MINIO_SECRET_KEY "Specify your SECRET_KEY:" "ePFRhVookGe1SX8u9boPHoNeMh2fAO5OmTjckzFN"
        set_env_step_data "MINIO_SECRET_KEY" "$MINIO_SECRET_KEY"
    fi

    mkdir -p $HOME/.mdos/minio

    # Add minio HELM repository
    helm repo add minio https://charts.min.io/ &>> $LOG_FILE

    # Create minio namespace
    unset NS_EXISTS
    check_kube_namespace NS_EXISTS "minio"
    if [ -z $NS_EXISTS ]; then
        kubectl create ns minio &>> $LOG_FILE
    fi

    # Install storage class provisionner for local path
    if [ ! -d "./local-path-provisioner" ]; then
        git clone https://github.com/rancher/local-path-provisioner.git &>> $LOG_FILE
    fi

    cd local-path-provisioner

    # Set up minio specific storage class
    helm upgrade --install minio-backup-storage-class \
        --set storageClass.name=local-path-minio-backup \
        --set nodePathMap[0].node=DEFAULT_PATH_FOR_NON_LISTED_NODES \
        --set nodePathMap[0].paths[0]=$HOME/.mdos/minio \
        ./deploy/chart/local-path-provisioner \
        -n minio --atomic &>> $LOG_FILE

    cd ..
    rm -rf local-path-provisioner

    # Install minio
    helm upgrade --install minio \
        --set persistence.enabled=true \
        --set persistence.storageClass=local-path-minio-backup \
        --set mode=standalone \
        --set resources.requests.memory=1Gi \
        --set rootUser=$MINIO_ACCESS_KEY \
        --set rootPassword=$MINIO_SECRET_KEY \
        minio/minio \
        -n minio --atomic &>> $LOG_FILE

    # Create virtual service for minio
    cat <<EOF | k3s kubectl apply -f &>> $LOG_FILE -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: minio-console
  namespace: minio
spec:
  gateways:
    - istio-system/http-gateway
  hosts:
    - minio-console.$DOMAIN
  http:
    - name: minio-console
      route:
        - destination:
            host: minio-console.minio.svc.cluster.local
            port:
              number: 9001
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
    name: minio
    namespace: minio
spec:
    gateways:
        - istio-system/http-gateway
    hosts:
        - minio-backup.$DOMAIN
    http:
        - name: minio
          route:
              - destination:
                    host: minio.minio.svc.cluster.local
                    port:
                        number: 9000
EOF
}

# ############################################
# ################# KEYCLOAK #################
# ############################################
install_keycloak() {
    if [ -z $KEYCLOAK_USER ]; then
        user_input KEYCLOAK_USER "Enter a admin username for Keycloak:"
        set_env_step_data "KEYCLOAK_USER" "$KEYCLOAK_USER"
    fi

    if [ -z $KEYCLOAK_PASS ]; then
        user_input KEYCLOAK_PASS "Enter a admin password for Keycloak:"
        set_env_step_data "KEYCLOAK_PASS" "$KEYCLOAK_PASS"
    fi

    if [ -z $KUBE_ADMIN_EMAIL ]; then
        user_input KUBE_ADMIN_EMAIL "Enter the admin email address for the default keycloak client user:"
        set_env_step_data "KUBE_ADMIN_EMAIL" "$KUBE_ADMIN_EMAIL"
    fi

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
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appName = "mdos-keycloak"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appInternalName = "mdos-keycloak"')

    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[1].value = "'$POSTGRES_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[2].value = "'$POSTGRES_PASSWORD'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[3].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[4].value = "'$KEYCLOAK_PASS'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[0].hostPath = "'$HOME'/.mdos/keycloak/db"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[1].hostPath = "'$KEYCLOAK_DB_SCRIPT_MOUNT'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].imagePullSecrets[0].name = "regcred"')

    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[0].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[1].value = "'$KEYCLOAK_PASS'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[2].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[3].value = "'$KEYCLOAK_PASS'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].persistence.hostpathVolumes[0].hostPath = "'$SSL_ROOT'/fullchain.pem"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].persistence.hostpathVolumes[1].hostPath = "'$SSL_ROOT'/privkey.pem"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].imagePullSecrets[0].name = "regcred"')

    collect_api_key() {
        echo ""
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

    # setup_keycloak_kubernetes_client() {
    #     # Create client for kubernetes
    #     curl -s -k --request POST \
    #         -H "Accept: application/json" \
    #         -H "Content-Type:application/json" \
    #         -H "Authorization: Bearer $KC_TOKEN" \
    #         -d '{"clientId": "kubernetes-cluster", "publicClient": true, "standardFlowEnabled": true, "directGrantsOnly": true, "redirectUris": ["*"], "protocolMappers": [{"name": "groups", "protocol": "openid-connect", "protocolMapper": "oidc-group-membership-mapper", "config": {"claim.name" : "groups", "full.path" : "true","id.token.claim" : "true", "access.token.claim" : "true", "userinfo.token.claim" : "true"}}]}' \
    #         https://keycloak.$DOMAIN/admin/realms/master/clients

    #     # Retrieve client UUID
    #     CLIENT_UUID=$(curl -s -k --request GET \
    #         -H "Accept: application/json" \
    #         -H "Content-Type:application/json" \
    #         -H "Authorization: Bearer $KC_TOKEN" \
    #         https://keycloak.$DOMAIN/admin/realms/master/clients?clientId=kubernetes-cluster | jq '.[0].id' | sed 's/[\"]//g')

    #     # Create mdos base group for k8s clusters in Keycloak
    #     curl -s -k --request POST \
    #         -H "Accept: application/json" \
    #         -H "Content-Type:application/json" \
    #         -H "Authorization: Bearer $KC_TOKEN" \
    #         -d '{"name": "mdos"}' \
    #         https://keycloak.$DOMAIN/admin/realms/master/groups

    #     # Create client roles in Keycloak
    #     curl -s -k --request POST \
    #         -H "Accept: application/json" \
    #         -H "Content-Type:application/json" \
    #         -H "Authorization: Bearer $KC_TOKEN" \
    #         --data '{"clientRole": true,"name": "mdos-sysadmin"}' \
    #         https://keycloak.$DOMAIN/admin/realms/master/clients/$CLIENT_UUID/roles

    #     SYSADMIN_ROLE_UUID=$(curl -s -k --request GET \
    #         -H "Accept: application/json" \
    #         -H "Content-Type:application/json" \
    #         -H "Authorization: Bearer $KC_TOKEN" \
    #         https://keycloak.$DOMAIN/admin/realms/master/clients/$CLIENT_UUID/roles/mdos-sysadmin | jq '.id' | sed 's/[\"]//g')

    #     # Update admin email and role
    #     ADMIN_U_ID=$(curl -s -k --request GET \
    #         -H "Accept: application/json" \
    #         -H "Content-Type:application/json" \
    #         -H "Authorization: Bearer $KC_TOKEN" \
    #         https://keycloak.$DOMAIN/admin/realms/master/users?username=$KEYCLOAK_USER | jq '.[0].id' | sed 's/[\"]//g')

    #     curl -s -k -X PUT \
    #         https://keycloak.$DOMAIN/admin/realms/master/users/$ADMIN_U_ID \
    #         -H "Content-Type: application/json"  \
    #         -H "Authorization: Bearer $KC_TOKEN" \
    #         -d '{"email": "'"$KUBE_ADMIN_EMAIL"'"}'

    #     curl -s -k --request POST \
    #         -H "Accept: application/json" \
    #         -H "Content-Type:application/json" \
    #         -H "Authorization: Bearer $KC_TOKEN" \
    #         --data '[{"name": "mdos-sysadmin", "id": "'"$SYSADMIN_ROLE_UUID"'"}]' \
    #         https://keycloak.$DOMAIN/admin/realms/master/users/$ADMIN_U_ID/role-mappings/clients/$CLIENT_UUID
    # }

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
            https://keycloak.$DOMAIN/admin/realms/$REALm/clients \
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

        # Create mdos admin role
        gen_api_token
        curl -s -k --request POST \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            -d '{"id": "mdos-admin", "name": "mdos-admin", "clientRole": true}' \
            https://keycloak.$DOMAIN/admin/realms/$REALM/clients/$MDOS_CLIENT_UUID/roles

        # Get mdos admin role UUID
        ROLE_UUID=$(curl -s -k --request GET \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            https://keycloak.$DOMAIN/admin/realms/$REALM/clients/$CLIENT_UUID/roles/mdos-admin | jq '.id' | sed 's/[\"]//g')

        # Create client role mapping for mdos admin user
        gen_api_token
        curl -s -k --request POST \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            -d '[{"id":"'$ROLE_UUID'","name":"mdos-admin"}]' \
            https://keycloak.$DOMAIN/admin/realms/$REALM/users/$MDOS_USER_UUID/role-mappings/clients/$MDOS_CLIENT_UUID
            
        # Create secret with credentials
        cat <<EOF | k3s kubectl apply -f &>> $LOG_FILE -
apiVersion: v1
kind: Secret
metadata:
  name: admin-creds
  namespace: keycloak
type: Opaque
stringData:
  clientSecret: $MDOS_CLIENT_SECRET
  email: $KUBE_ADMIN_EMAIL
  password: $KEYCLOAK_PASS
  username: $KEYCLOAK_USER
EOF
    }

    echo "${REG_PASS}" | docker login registry.$DOMAIN --username ${REG_USER} --password-stdin &>> $LOG_FILE

    # Pull & push images to registry
	docker pull postgres:13.2-alpine &>> $LOG_FILE
	docker tag postgres:13.2-alpine registry.$DOMAIN/postgres:13.2-alpine &>> $LOG_FILE
	docker push registry.$DOMAIN/postgres:13.2-alpine &>> $LOG_FILE

	docker pull quay.io/keycloak/keycloak:18.0.2 &>> $LOG_FILE
	docker tag quay.io/keycloak/keycloak:18.0.2 registry.$DOMAIN/keycloak:18.0.2 &>> $LOG_FILE
	docker push registry.$DOMAIN/keycloak:18.0.2 &>> $LOG_FILE

    mkdir -p $HOME/.mdos/keycloak/db

    # Deploy keycloak
    cat "$KEYCLOAK_VAL" > ./target_values.yaml

    mdos_deploy_app &>> $LOG_FILE
    rm -rf ./target_values.yaml

	# Configure API key
	collect_api_key

	# gen_api_token
	# setup_keycloak_kubernetes_client

	gen_api_token
	setup_keycloak_mdos_realm
}


# ############################################
# ########### INSTALL OAUTH2-PROXY ###########
# ############################################
install_oauth2_proxy() {
    helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests
    helm repo update
    kubectl create ns oauth2-proxy && kubectl label ns oauth2-proxy istio-injection=enabled

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
      oauth2-proxy-mdos oauth2-proxy/oauth2-proxy --atomic
}

# ############################################
# ############### INSTALL MDOS ###############
# ############################################
install_mdos() {
    k8s_cluster_scope_exist ELM_EXISTS ns "mdos"
    if [ -z $ELM_EXISTS ]; then
        kubectl create ns mdos &>> $LOG_FILE
        kubectl label ns mdos istio-injection=enabled &>> $LOG_FILE
    fi

    k8s_ns_scope_exist ELM_EXISTS secret "default" "mdos"
    if [ -z $ELM_EXISTS ]; then
cat <<EOF | kubectl create -f -
apiVersion: v1
kind: Secret
metadata:
  name: default
  namespace: mdos
  annotations:
    kubernetes.io/service-account.name: "default"
type: kubernetes.io/service-account-token
EOF

    # Admin role
    k8s_cluster_scope_exist ELM_EXISTS clusterrole "mdos-admin-role"
    if [ -z $ELM_EXISTS ]; then
        cat <<EOF | kubectl create -f -
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
        cat <<EOF | kubectl create -f -
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

    # Deploy keycloak
    cat ./dep/mdos-api/values.yaml > ./target_values.yaml

    MDOS_ACBM_APP_UUID=$(cat ./target_values.yaml | yq eval '.appUUID')
    MDOS_ACBM_APP_CMP_UUID=$(cat ./target_values.yaml | yq eval '.appComponents[0].appCompUUID')
    MDOS_ACBM_APP_CMP_NAME=$(cat ./target_values.yaml | yq eval '.appComponents[0].name')

    mdos_deploy_app
    rm -rf ./target_values.yaml

    cat <<EOF | kubectl apply -f -
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: oidc-mdos-ra
  namespace: mdos
spec:
  jwtRules:
  - issuer: $OIDC_ISSUER_URL
    jwksUri: $OIDC_JWKS_URI
  selector:
    matchLabels:
      app: mdos-api
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: oidc-mdos-ap
  namespace: mdos
spec:
  action: CUSTOM
  provider:
    name: oauth2-proxy-mdos
  rules:
  - to:
    - operation:
        hosts:
        - "mdos-api.$DOMAIN"
  selector:
    matchLabels:
      appUUID: $MDOS_ACBM_APP_UUID
      appCompUUID: $MDOS_ACBM_APP_CMP_UUID
      mdosAcbmAppCompName: $MDOS_ACBM_APP_CMP_NAME
EOF
}


# ###########################################################################################################################
# ########################################################### MAIN ##########################################################
# ###########################################################################################################################
(
    set -Ee

    function _catch {
        GLOBAL_ERROR=1
        # Rollback
        if [ -z $IN_CLEANUP ]; then
            echo ""
            error "An error occured"
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

        if [ "$(echo "$ALL_IMAGES" | grep "postgres" | grep "13.2-alpine" | awk '{print $1}')" != "postgres" ]; then
            docker rmi postgres:13.2-alpine &>> $LOG_FILE
        fi

        echo ""
        if [ -z $GLOBAL_ERROR ] && [ "$CERT_MODE" == "SELF_SIGNED" ]; then
            warn "You choose to generate a self signed certificate for this installation."
            echo "      All certificates are located under the folder $SSL_ROOT."
            echo "      You can use those certificates to allow your external tools to"
            echo "      communicate with the platform (ex. docker)."
            echo ""

            if [ -z $GLOBAL_ERROR ]; then
                info "The following services are available on the platform:"
                echo "        - registry.$DOMAIN"
                echo "        - minio-console.$DOMAIN"
                echo "        - minio.$DOMAIN"
                echo ""
            fi
        fi

        note_print "Log details of the nstallation can be found here: $LOG_FILE"

        if [ -z $GLOBAL_ERROR ]; then
            info "Done!"
        fi
    }

    trap _catch ERR
    trap _finally EXIT

    # ############### MAIN ################
    if [ -z $INST_STEP_DEPENDENCY ]; then
        info "Update system and install dependencies..."
        dependencies
        set_env_step_data "INST_STEP_DEPENDENCY" "1"
    fi

    echo ""

    # WHAT CERT MODE
    if [ -z $INST_STEP_MODE_SELECT ]; then
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
        set_env_step_data "CERT_MODE" "$CERT_MODE"
        set_env_step_data "INST_STEP_MODE_SELECT" "1"
    fi

    # PREPARE CERTIFICATES & DOMAIN
    if [ "$CERT_MODE" == "CLOUDFLARE" ]; then
        if [ -z $DOMAIN ]; then
            user_input DOMAIN "Enter your DNS root domain name (ex. mydomain.com):" 
            set_env_step_data "DOMAIN" "$DOMAIN"
        fi

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
        if [ -z $DOMAIN ]; then
            user_input DOMAIN "Enter your DNS root domain name (ex. mydomain.com):" 
            set_env_step_data "DOMAIN" "$DOMAIN"
        fi

        SSL_ROOT=$HOME/.mdos/ss_cert

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
        echo ""
        set_env_step_data "INST_STEP_REGISTRY" "1"
    fi

    # INSTALL KEYCLOAK
    if [ -z $INST_STEP_KEYCLOAK ]; then
        info "Install Keycloak..."
        echo ""
        install_keycloak
        set_env_step_data "MDOS_CLIENT_SECRET" "$MDOS_CLIENT_SECRET"
        set_env_step_data "INST_STEP_KEYCLOAK" "1"
    fi

    # LOAD OAUTH2 DATA
    OIDC_DISCOVERY=$(curl "https://keycloak.$DOMAIN/realms/mdos/.well-known/openid-configuration")
    OIDC_ISSUER_URL=$(echo $OIDC_DISCOVERY | jq -r .issuer)
    OIDC_JWKS_URI=$(echo $OIDC_DISCOVERY | jq -r .jwks_uri) 
    OIDC_USERINPUT_URI=$(echo $OIDC_DISCOVERY | jq -r .userinfo_endpoint)
    COOKIE_SECRET=$(openssl rand -base64 32 | tr -- '+/' '-_')
    REALM="mdos"
    CLIENT_ID="mdos"

    # INSTALL OAUTH2 PROXY
    if [ -z $INST_STEP_OAUTH ]; then
        info "Install OAuth2 proxy..."
        echo ""
        install_oauth2_proxy
        set_env_step_data "INST_STEP_OAUTH" "1"
    fi

    # INSTALL MDOS
    if [ -z $INST_STEP_MDOS ]; then
        info "Install MDos API server..."
        install_mdos
        set_env_step_data "INST_STEP_MDOS" "1"
    fi

    # INSTALL MINIO
    if [ -z $INST_STEP_MINIO ]; then
        info "Install Minio..."
        echo ""
        install_minio
        set_env_step_data "INST_STEP_MINIO" "1"
    fi
)