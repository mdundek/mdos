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
source ./lib/mdos_lib.sh

clear
echo '
  __  __ ___   ___  ___   ___ _  _ ___ _____ _   _    _    
 |  \/  |   \ / _ \/ __| |_ _| \| / __|_   _/_\ | |  | |   
 | |\/| | |) | (_) \__ \  | || .` \__ \ | |/ _ \| |__| |__ 
 |_|  |_|___/ \___/|___/ |___|_|\_|___/ |_/_/ \_\____|____|
                                                           
'     

# Make sure connectivity to the internet is ok
internet_check

# Os checks
os_check

# Resource check
# resources_check 3500 4GB

LOG_FILE="$HOME/$(date +'%m_%d_%Y_%H_%M_%S')_mdos_install.log"

# PARSE USER INPUT
while [ "$1" != "" ]; do
    case $1 in
        --reset )
            rm -rf $HOME/.mdos
        ;;
        --broker-size )
            shift
            BROKER_SIZE_OVERWRITE=$1
        ;;
        --keycloak-size )
            shift
            KEYCLOAK_SIZE_OVERWRITE=$1
        ;;
        --loki-size )
            shift
            LOKI_SIZE_OVERWRITE=$1
        ;;
        * ) error "Invalid parameter detected: $1"
            exit 1
    esac
    shift
done

# ############################################
# ################# VARIABLES ################
# ############################################
RABBIT_MQ_VOLUME_SIZE=3
LOKI_VOLUME_SIZE=5
KEYCLOAK_VOLUME_SIZE=5

REGISTRY_MIN_VOLUME_SIZE=5
EXTRA_RESERVED_VOLUME_SIZE=5
# ############################################

if [ ! -z $BROKER_SIZE_OVERWRITE ]; then
    RABBIT_MQ_VOLUME_SIZE=$BROKER_SIZE_OVERWRITE
fi
if [ ! -z $LOKI_SIZE_OVERWRITE ]; then
    LOKI_VOLUME_SIZE=$LOKI_SIZE_OVERWRITE
fi
if [ ! -z $KEYCLOAK_SIZE_OVERWRITE ]; then
    KEYCLOAK_VOLUME_SIZE=$KEYCLOAK_SIZE_OVERWRITE
fi

DISK_TOTAL_RESERVED=$((RABBIT_MQ_VOLUME_SIZE+LOKI_VOLUME_SIZE+KEYCLOAK_VOLUME_SIZE+REGISTRY_MIN_VOLUME_SIZE+EXTRA_RESERVED_VOLUME_SIZE))
DISK_TOTAL_FIXED_RESERVED=$((RABBIT_MQ_VOLUME_SIZE+LOKI_VOLUME_SIZE+KEYCLOAK_VOLUME_SIZE+EXTRA_RESERVED_VOLUME_SIZE))

# LOAD INSTALLATION TRACKING LOGS
INST_ENV_PATH="$HOME/.mdos/install.dat"
mkdir -p "$HOME/.mdos"
if [ -f $INST_ENV_PATH ]; then
    source $INST_ENV_PATH
else
    touch $HOME/.mdos/install.dat
fi

# ############################################
# ############# COLLECT USER DATA ############
# ############################################
collect_user_input() {
    pathRe='^/[A-Za-z0-9/_-]+$'

    # COLLECT LOCAL IP FOR K3S ENDPOINTS
    if command -v getent >/dev/null; then
        if command -v ip >/dev/null; then
            # Get the default network interface in use to connect to the internet
            host_ip=$(getent ahosts "google.com" | awk '{print $1; exit}')
            INETINTERFACE=$(ip route get "$host_ip" | grep -Po '(?<=(dev ))(\S+)')
            LOC_IP=$(ip addr show $INETINTERFACE | grep "inet\b" | awk '{print $2}' | cut -d/ -f1)
        fi
    fi
    
    echo ""
    context_print "MDos will need to know how to reach services running on the host directly"
    context_print "from within the cluster. An IP address is therefore required."
    echo ""

    unset LOOP_BREAK
    while [ -z $LOOP_BREAK ]; do
        if [ -z $LOC_IP ]; then
            user_input LOCAL_IP "MDos Host IP address:"
        else
            user_input LOCAL_IP "MDos Host IP address:" "$LOC_IP"
        fi
        if [[ $LOCAL_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            LOOP_BREAK=1
        else
            error "Invalid IP address"
        fi
    done

    # COLLECT ADMIN CREDS
    print_section_title "Admin user account"
    user_input KEYCLOAK_USER "Enter a admin username for the platform:"
    user_input KUBE_ADMIN_EMAIL "Enter the admin email address for the default keycloak client user:"
    user_input KEYCLOAK_PASS "Enter a admin password for the platform:"

    # CERT MODE
    print_section_title "Domain name and certificate"
    OPTIONS_STRING="You already have a certificate and a wild card domain;Use \"cert-manager\" to manage generare & manage your certificate;Generate and use self signed certificate, I do not have a domain"
    OPTIONS_VALUES=("CRT_PROVIDED" "CERT_MANAGER" "SELF_SIGNED")
    set +Ee
    prompt_for_select CMD_SELECT "$OPTIONS_STRING"
    set -Ee
    for i in "${!CMD_SELECT[@]}"; do
        if [ "${CMD_SELECT[$i]}" == "true" ]; then
            CERT_MODE="${OPTIONS_VALUES[$i]}"
        fi
    done

    # PREPARE CERTIFICATES & DOMAIN
    if [ "$CERT_MODE" == "CERT_MANAGER" ]; then
        context_print "This installation script will install \"cert-manager\" and generate your MDos root"
        context_print "domain (wildcard) certificate for you. You will have to provide the \"cert-manager\""
        context_print "Issuer (and Secret if applicable) yaml file to use for this, according to your certificate"
        context_print "issuer of choice. Please refer to the documentation on the following link in order to do so:"
        context_print "https://cert-manager.io/docs/configuration/acme/dns01/#supported-dns01-providers"
        context_print "An example Issuer Yaml file based on CloudFlare can be found here:"
        context_print "https://raw.githubusercontent.com/mdundek/mdos/cert-manager/mdos-setup/dep/cert-manager/cloudflare-issuer.yaml"
        echo ""
        warn "Make sure you name your Issuer \"mdos-issuer\" (metadata.name: mdos-issuer)"
        echo ""
        unset LOOP_BREAK
        while [ -z $LOOP_BREAK ]; do
            user_input ISSUER_YAML_PATH "Please enter the absolute path to your Issuer yaml file (ex. /path/to/my-cert-manager-issuer.yaml):"
            if [ -f $ISSUER_YAML_PATH ]; then
                ISSUER_NAME=$(cat $ISSUER_YAML_PATH | /usr/local/bin/yq eval 'select(.kind == "Issuer") | .metadata.name')
                if [ "$ISSUER_NAME" != "mdos-issuer" ]; then
                    error "Issuer name has to be \"mdos-issuer\" (metadata.name: mdos-issuer)"
                else
                    LOOP_BREAK=1
                fi
            else
                error "File not found"
            fi
        done
        # Domain name
        user_input DOMAIN "Enter your DNS root domain name (ex. mydomain.com):" 
    elif [ "$CERT_MODE" == "SELF_SIGNED" ]; then
        user_input DOMAIN "Enter your DNS root domain name (ex. mydomain.com):" 
        set +Ee
        yes_no DNS_RESOLVABLE "Is your domain \"$DOMAIN\" resolvable through a public or private DNS server?"
        set -Ee
        if [ "$DNS_RESOLVABLE" == "no" ]; then
            NO_DNS=1
        fi
    else
        warn "It is assumed that your domain for the certificate you wish to use is configured (DNS) to route traffic directly to this host IP"
        user_input DOMAIN "Enter your DNS root domain name for your certificate(ex. mydomain.com):" 

        unset LOOP_BREAK
        while [ -z $LOOP_BREAK ]; do
            user_input OWN_FULLCHAIN_CRT_PATH "Please enter the absolute path to your fullchain PEM certificate (ex. /path/to/fullchain.pem):"
            if [ -f $OWN_FULLCHAIN_CRT_PATH ]; then
                LOOP_BREAK=1
            else
                error "File not found"
            fi
        done

        unset LOOP_BREAK
        while [ -z $LOOP_BREAK ]; do
            user_input OWN_PRIVKEY_PATH "Please enter the absolute path to your private key (ex. /path/to/privkey.pem):"
            if [ -f $OWN_PRIVKEY_PATH ]; then
                LOOP_BREAK=1
            else
                error "File not found"
            fi
        done

        if [ "$(dirname "${OWN_FULLCHAIN_CRT_PATH}")" != "$(dirname "${OWN_PRIVKEY_PATH}")" ]; then
            error "The fullchain certificate and private key file need to located in the same directory"
            exit 1
        fi

        set +Ee
        yes_no PROV_CERT_IS_SELFSIGNED "Is the domain \"$DOMAIN\" properly configured on a DNS provider to point to this server?"
        set -Ee
        if [ "$PROV_CERT_IS_SELFSIGNED" == "no" ]; then
            PROV_CERT_IS_SELFSIGNED=1
        else
            unset PROV_CERT_IS_SELFSIGNED
        fi
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
        AVAIL_DISK_SPACE=$(df $LONGHORN_DEFAULT_DIR | sed -n 2p | awk '{printf "%.0f \n", $4/1024/1024}')
    else
        LONGHORN_DEFAULT_DIR="/var/lib/longhorn"
        AVAIL_DISK_SPACE=$(df /var | sed -n 2p | awk '{printf "%.0f \n", $4/1024/1024}')
    fi

    # Make sure we have enougth disk space
    if [ "$AVAIL_DISK_SPACE" -lt "$DISK_TOTAL_RESERVED" ]; then
        EARLY_EXIT=1
        error "Insufficient disk space, a minimum of ${DISK_TOTAL_RESERVED}Gb of available disk space is required, but only ${AVAIL_DISK_SPACE}Gi are available"
        exit 1
    fi

    # REGISTRY
    REGISTRY_MAX_DISK_SIZE=$((AVAIL_DISK_SPACE-DISK_TOTAL_FIXED_RESERVED))
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
            user_input REGISTRY_SIZE "How many Gi (Gigabytes) do you want to allocate to your registry volume:"
        done

        while [ "$((REGISTRY_MAX_DISK_SIZE-REGISTRY_SIZE))" -lt "0" ]; do
            error "Insufficient disk space, you can allocate a maximum of ${REGISTRY_MAX_DISK_SIZE}Gi"
            user_input REGISTRY_SIZE "How many Gi (Gigabytes) do you want to allocate to your registry volume:"
        done
    elif [ "$((REGISTRY_MAX_DISK_SIZE-REGISTRY_SIZE))" -lt "0" ]; then
        EARLY_EXIT=1
        error "Insufficient disk space, you can allocate a maximum of ${REGISTRY_MAX_DISK_SIZE}Gi"
        exit 1
    fi
    REMAINING_DISK=$((AVAIL_DISK_SPACE-REGISTRY_SIZE-DISK_TOTAL_FIXED_RESERVED))

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
            EARLY_EXIT=1
            exit 1
        fi
    fi

    # DISK PESSURE WARNINGS IF ANY
    if [ "$REMAINING_DISK" -lt "10" ]; then
        warn "You are running low on disk space, you only have ${REMAINING_DISK}Gi left on your Kubernetes storage device once everything is installed"
    fi
}

# ############################################
# ############### CERT MANAGER ###############
# ############################################
setup_cert_manager() {
    $helm repo add jetstack https://charts.jetstack.io &>> $LOG_FILE
    $helm repo update &>> $LOG_FILE
    $helm install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --version v1.9.1 \
        --set installCRDs=true \
        --atomic &>> $LOG_FILE

    # Wait untill all pods are up and running
    unset FOUND_RUNNING_POD
    while [ -z $FOUND_RUNNING_POD ]; do
        unset CM_POD_UP
        unset CM_INJ_POD_UP
        unset CM_WEBHOOK_POD_UP
        while read POD_LINE ; do
            POD_NAME=`echo "$POD_LINE" | awk 'END {print $1}'`
            POD_STATUS=`echo "$POD_LINE" | awk 'END {print $3}'`
            if [[ "$POD_NAME" == *"cert-manager-cainjector-"* ]]; then
                if [ "$POD_STATUS" == "Running" ]; then
                    CM_INJ_POD_UP=1
                fi
            elif [[ "$POD_NAME" == *"cert-manager-webhook-"* ]]; then
                if [ "$POD_STATUS" == "Running" ]; then
                    CM_WEBHOOK_POD_UP=1
                fi
            elif [[ "$POD_NAME" == *"cert-manager-"* ]]; then
                if [ "$POD_STATUS" == "Running" ]; then
                    CM_POD_UP=1
                fi
            fi
        done < <($kubectl get pods -n cert-manager 2>/dev/null)
        if [ ! -z $CM_POD_UP ] && [ ! -z $CM_INJ_POD_UP ] && [ ! -z $CM_WEBHOOK_POD_UP ]; then
            FOUND_RUNNING_POD=1
        fi
        sleep 2
    done
}

# ############################################
# ############ PREPARE NAMESPACES ############
# ############################################
prepare_namespaces(){
    $kubectl create ns mdos > /dev/null 2>&1 || true
    $kubectl create ns mdos-registry > /dev/null 2>&1 || true
    $kubectl create ns keycloak > /dev/null 2>&1 || true

    # Registry secret
    unset ELM_EXISTS
    k8s_ns_scope_exist ELM_EXISTS secret "regcred" "mdos"
    if [ -z $ELM_EXISTS ]; then
        $kubectl create secret docker-registry \
            regcred \
            --docker-server=registry.$DOMAIN \
            --docker-username=$KEYCLOAK_USER \
            --docker-password=$KEYCLOAK_PASS \
            -n mdos &>> $LOG_FILE
    fi

    # Certificate secret if not using cert-manager
    if [ "$CERT_MODE" != "CERT_MANAGER" ]; then
        unset ELM_EXISTS
        k8s_ns_scope_exist ELM_EXISTS secret "mdos-root-domain-tls" "mdos"
        if [ -z $ELM_EXISTS ]; then
            $kubectl create -n mdos secret tls mdos-root-domain-tls --key=$SSL_ROOT/$PRIVKEY_FNAME --cert=$SSL_ROOT/$FULLCHAIN_FNAME &>> $LOG_FILE
        fi
    fi

    # default secret for SA
    unset ELM_EXISTS
    k8s_ns_scope_exist ELM_EXISTS secret "default" "mdos"
    if [ -z $ELM_EXISTS ]; then
        cat <<EOF | $kubectl create -f &>> $LOG_FILE -
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
    unset ELM_EXISTS
    k8s_cluster_scope_exist ELM_EXISTS clusterrole "mdos-admin-role"
    if [ -z $ELM_EXISTS ]; then
        cat <<EOF | $kubectl create -f &>> $LOG_FILE -
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
        cat <<EOF | $kubectl create -f &>> $LOG_FILE -
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
}

# ############################################
# ######### CERT MANAGER MDOS ISSUER #########
# ############################################
cert_manager_mdos_issuer_and_crt_secret() {
    # Install Issuer (Secret + Issuer)
    info "Configure mdos cert-manager issuer..."
    $kubectl apply -f $ISSUER_YAML_PATH -n mdos &>> $LOG_FILE

    # Waiting for issuer to become ready
    unset LOOP_BREAK
    while [ -z $LOOP_BREAK ]; do
        ISSUER_STATUS=$($kubectl get issuers -n mdos -o json | jq -r '.items[0].status.conditions[0].type')
        if [ "$ISSUER_STATUS" == "Ready" ]; then
            LOOP_BREAK=1
        else
            sleep 2
        fi
    done 
    
    # Create certificate
    info "Create MDos certificate using issuer for domain $DOMAIN..."
    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mdos-root-domain
  namespace: mdos
spec:
  secretName: mdos-root-domain-tls
  duration: 2160h
  renewBefore: 360h
  dnsNames:
    - "*.$DOMAIN"
  issuerRef:
    name: mdos-issuer
    kind: Issuer
EOF

    # Waiting for certificate to become available
    while [ "$($kubectl get secret -n mdos | grep 'mdos-root-domain-tls')" == "" ]; do
        sleep 3
        ATTEMPTS=$((ATTEMPTS+1))
        if [ "$ATTEMPTS" -gt 100 ]; then
            error "Timeout, Certificate was not issued, most probably due to a miss-configuration of the Issuer itself."
            exit 1
        fi
    done
}

mdos_secret_replicator_job() {
    # Build cert-manager secret replicator job image
    cd ./dep/images/cert-job-manager
    DOCKER_BUILDKIT=1 docker build -t registry.$DOMAIN/cert-manager-replicate-bot:latest . &>> $LOG_FILE

    # Load image to containerd image context
    docker save registry.$DOMAIN/cert-manager-replicate-bot:latest > ./cert-manager-replicate-bot.tar
    $k3s ctr images import ./cert-manager-replicate-bot.tar &>> $LOG_FILE
    rm -rf ./cert-manager-replicate-bot.tar
    cd ../../..

    # Export certificate
    info "Create Kubernetes CronJob to export certificate for third party components..."
    mkdir -p /etc/letsencrypt/live/$DOMAIN
    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
apiVersion: batch/v1
kind: Job
metadata: 
  name: mdos-crt-export-job
  namespace: mdos
spec:
  backoffLimit: 4
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: cert-exporter
        image: registry.$DOMAIN/cert-manager-replicate-bot:latest
        imagePullPolicy: IfNotPresent
        command:
        - /bin/sh
        - -c
        - $kubectl get secret mdos-root-domain-tls -n mdos -o yaml | grep -v '^\s*namespace:\s' | grep -v '^\s*creationTimestamp:\s' | grep -v '^\s*resourceVersion:\s' | grep -v '^\s*uid:\s' | kubectl apply --namespace=mdos-registry -f -;kubectl get secret mdos-root-domain-tls -n mdos -o yaml | grep -v '^\s*namespace:\s' | grep -v '^\s*creationTimestamp:\s' | grep -v '^\s*resourceVersion:\s' | grep -v '^\s*uid:\s' | kubectl apply --namespace=keycloak -f -;kubectl get secret mdos-root-domain-tls -n mdos -o yaml | grep -v '^\s*namespace:\s' | grep -v '^\s*creationTimestamp:\s' | grep -v '^\s*resourceVersion:\s' | grep -v '^\s*uid:\s' | kubectl apply --namespace=istio-system -f -
      imagePullSecrets:
      - name: regcred
EOF

    # Waiting for issuer to become ready
    unset LOOP_BREAK
    while [ -z $LOOP_BREAK ]; do
        JOB_STATUS=$($kubectl get job mdos-crt-export-job -n mdos -o json | jq -r '.status.conditions[0].type')
        if [ "$JOB_STATUS" == "Complete" ]; then
            LOOP_BREAK=1
        else
            sleep 2
        fi
    done

    # Now schedule a chronJob in Kubernetes to export the generated certificate once a day to
    # the local filesystem so that other services such as Keycloak and the FTP server can use it as well
    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mdos-crt-exporter
  namespace: mdos
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: cert-exporter
            image: registry.$DOMAIN/cert-manager-replicate-bot:latest
            imagePullPolicy: IfNotPresent
            command:
            - /bin/sh
            - -c
            - $kubectl get secret mdos-root-domain-tls -n mdos -o yaml | grep -v '^\s*namespace:\s' | grep -v '^\s*creationTimestamp:\s' | grep -v '^\s*resourceVersion:\s' | grep -v '^\s*uid:\s' | $kubectl apply --namespace=mdos-registry -f -;$kubectl get secret mdos-root-domain-tls -n mdos -o yaml | grep -v '^\s*namespace:\s' | grep -v '^\s*creationTimestamp:\s' | grep -v '^\s*resourceVersion:\s' | grep -v '^\s*uid:\s' | $kubectl apply --namespace=keycloak -f -;$kubectl get secret mdos-root-domain-tls -n mdos -o yaml | grep -v '^\s*namespace:\s' | grep -v '^\s*creationTimestamp:\s' | grep -v '^\s*resourceVersion:\s' | grep -v '^\s*uid:\s' | $kubectl apply --namespace=istio-system -f -
          imagePullSecrets:
          - name: regcred
EOF
}

cert_manager_secret_replicator_reg_push() {
    # Registry might need some time to be up and ready, we therefore loop untill success for first push
    failsafe_docker_push registry.$DOMAIN/cert-manager-replicate-bot:latest
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
    if [ "$(cat /etc/hosts | grep grafana.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 grafana.$DOMAIN" >> /etc/hosts
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

    cp $SSL_ROOT/$DOMAIN.key $SSL_ROOT/$PRIVKEY_FNAME
    cp $SSL_ROOT/$DOMAIN.crt $SSL_ROOT/$FULLCHAIN_FNAME
    chmod 655 $SSL_ROOT/*.pem
}

# ############################################
# ############### INSTALL K3S ################
# ############################################
install_k3s() {
    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="v1.24.6+k3s1" K3S_KUBECONFIG_MODE="644" INSTALL_K3S_EXEC="--flannel-backend=none --cluster-cidr=192.169.0.0/16 --disable-network-policy --disable=traefik --write-kubeconfig-mode=664 --advertise-address=$LOCAL_IP" sh - &>> $LOG_FILE
    
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

    # Make sure kubectl is installed
    set -Ee
    if ! command -v kubectl >/dev/null; then
        if [ ! -f /usr/local/bin/kubectl ]; then
            curl -LO "https://dl.k8s.io/release/v1.24.6/bin/linux/amd64/kubectl"
            install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
        fi
        kubectl="/usr/local/bin/kubectl"
    else
        kubectl=$(whereis kubectl | cut -d: -f2 | xargs)
    fi
    set +Ee

    # Install Calico
    $kubectl create -f https://projectcalico.docs.tigera.io/manifests/tigera-operator.yaml &>> $LOG_FILE
    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
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
    while [ "$($kubectl get node | grep 'NotReady')" != "" ]; do
        sleep 3
        ATTEMPTS=$((ATTEMPTS+1))
        if [ "$ATTEMPTS" -gt 100 ]; then
            error "Timeout, Kubernetes did not come online, it is assumed there is a problem. Please check with the command kubectl get nodes and kubectl describe node <node name> for more information about the issue"
            exit 1
        fi
    done

    # Restart codedns to make sure external dns resolution works
    $kubectl -n kube-system rollout restart deployment coredns &>> $LOG_FILE
    sleep 10

    # Add label to master node to allow specific pods
    # to be scheduled on this node always
    $kubectl label nodes $(hostname) mdos-stack=true &>> $LOG_FILE
}

# ############################################
# ############# INSTALL LONGHORN #############
# ############################################
install_longhorn() {
    $kubectl create namespace longhorn-system &>> $LOG_FILE
    $kubectl apply -n longhorn-system -f https://raw.githubusercontent.com/longhorn/longhorn/v1.2.1/deploy/prerequisite/longhorn-iscsi-installation.yaml &>> $LOG_FILE
    $kubectl apply -n longhorn-system -f https://raw.githubusercontent.com/longhorn/longhorn/v1.2.1/deploy/prerequisite/longhorn-nfs-installation.yaml &>> $LOG_FILE

    cp $_DIR/dep/longhorn/chart/values.yaml $_DIR/dep/longhorn/chart/values_backup.yaml

    LONGHORN_VALUES="$(cat $_DIR/dep/longhorn/chart/values.yaml)"

    LONGHORN_VALUES=$(echo "$LONGHORN_VALUES" | /usr/local/bin/yq '.defaultSettings.defaultReplicaCount = 2')
    if [ "$CUSTOM_LH_PATH" == "yes" ]; then
        LONGHORN_VALUES=$(echo "$LONGHORN_VALUES" | /usr/local/bin/yq '.defaultSettings.defaultDataPath = "'$LONGHORN_DEFAULT_DIR'"')
    fi

    printf "$LONGHORN_VALUES\n" > $_DIR/dep/longhorn/chart/values.yaml

    $helm install longhorn $_DIR/dep/longhorn/chart --values $_DIR/dep/longhorn/chart/values.yaml \
        --namespace longhorn-system --atomic &>> $LOG_FILE

    rm -rf $_DIR/dep/longhorn/chart/values.yaml
    mv $_DIR/dep/longhorn/chart/values_backup.yaml $_DIR/dep/longhorn/chart/values.yaml
    
    sleep 10

    # Wait for all pods to be on
    wait_all_ns_pods_healthy "longhorn-system"
}

setup_longhorn_vs() {
    # Create Virtual Service
    set +Ee
    while [ -z $VS_SUCCESS ]; do
        cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  labels:
    app: longhorn-ui
  name: longhorn-ui-ingress
  namespace: longhorn-system
spec:
  gateways:
  - mdos/https-gateway
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
    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  labels:
    app: longhorn-ui-ra
  name: longhorn-ui-ra
  namespace: longhorn-system
spec:
  jwtRules:
  - issuer: https://keycloak.$DOMAIN:30999/realms/mdos
    jwksUri: https://keycloak.$DOMAIN:30999/realms/mdos/protocol/openid-connect/certs
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
    set -Ee
    if ! command -v helm &> /dev/null; then
        set +Ee
        if [ ! -f /usr/local/bin/helm ]; then
            curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
            chmod 700 get_helm.sh
            ./get_helm.sh &>> $LOG_FILE
            rm -rf ./get_helm.sh
        fi
    else
        set +Ee
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
        $kubectl create namespace istio-system &>> $LOG_FILE
    fi

    # Install base istio components
    $helm upgrade --install istio-base ./dep/istio_helm/base -n istio-system &>> $LOG_FILE

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
      
    $helm upgrade --install istiod ./dep/istio_helm/istio-control/istio-discovery -f $_DIR/istiod-values.yaml -n istio-system &>> $LOG_FILE
    rm -rf $_DIR/istiod-values.yaml

    ATTEMPTS=0
    while [ "$($kubectl get pod -n istio-system | grep 'istiod-' | grep 'Running')" == "" ]; do
        sleep 3
        ATTEMPTS=$((ATTEMPTS+1))
        if [ "$ATTEMPTS" -gt 100 ]; then
            error "Timeout, Istio did not deploy in time. Please check with the command 'kubectl get pod -n istio-system' and 'kubectl describe pod <pod name> -n istio-system' for more information about the issue"
            exit 1
        fi
    done
    
    $helm upgrade --install istio-ingress ./dep/istio_helm/gateways/istio-ingress -n istio-system &>> $LOG_FILE

    ATTEMPTS=0
    while [ "$($kubectl get pod -n istio-system | grep 'istio-ingressgateway-' | grep 'Running')" == "" ]; do
        sleep 3
        ATTEMPTS=$((ATTEMPTS+1))
        if [ "$ATTEMPTS" -gt 100 ]; then
            error "Timeout, Istio ingress gateway did not deploy in time. Please check with the command 'kubectl get pod -n istio-system' and 'kubectl describe pod <pod name> -n istio-system' for more information about the issue"
            exit 1
        fi
    done

    # Wait for all pods to be on
    wait_all_ns_pods_healthy "istio-system"
}

deploy_istio_gateways() {
    # Deploy Istio Gateways
    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: https-gateway
  namespace: mdos
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
      credentialName: mdos-root-domain-tls
---
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: https-gateway-mdos
  namespace: mdos
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
    - "keycloak.$DOMAIN"
    tls:
      mode: PASSTHROUGH
EOF
}

# ############################################
# ############# INSTALL REGISTRY #############
# ############################################
install_registry() {
    # Deploy registry
    deploy_reg_chart

    # Update docker and K3S registry for self signed cert
    if [ "$CERT_MODE" == "SELF_SIGNED" ] || [ ! -z $PROV_CERT_IS_SELFSIGNED ]; then
        # Configure self signed cert with local docker deamon
        if [ ! -d /etc/docker/certs.d/registry.$DOMAIN ]; then
            mkdir -p /etc/docker/certs.d/registry.$DOMAIN
            cp $SSL_ROOT/$FULLCHAIN_FNAME /etc/docker/certs.d/registry.$DOMAIN/ca.crt

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
      cert_file: $SSL_ROOT/$FULLCHAIN_FNAME
      key_file: $SSL_ROOT/$PRIVKEY_FNAME
      ca_file: $SSL_ROOT/$FULLCHAIN_FNAME" > /etc/rancher/k3s/registries.yaml
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

    REG_VALUES=$(echo "$REG_VALUES" | /usr/local/bin/yq '.components[0].ingress[0].matchHost = "registry.'$DOMAIN'"')
    REG_VALUES=$(echo "$REG_VALUES" | /usr/local/bin/yq '.components[1].ingress[0].matchHost = "registry-auth.'$DOMAIN'"')
    REG_VALUES=$(echo "$REG_VALUES" | /usr/local/bin/yq '.components[0].volumes[0].size = "'$REGISTRY_SIZE'Gi"')
    REG_VALUES=$(echo "$REG_VALUES" | /usr/local/bin/yq '.components[0].configs[0].entries[2].value = "https://registry-auth.'$DOMAIN'/auth"')

    if [ ! -z $NO_DNS ]; then
        REG_VALUES=$(echo "$REG_VALUES" | /usr/local/bin/yq '.components[0].hostAliases[0].ip = "'$LOCAL_IP'"')
        REG_VALUES=$(echo "$REG_VALUES" | /usr/local/bin/yq '.components[0].hostAliases[0].hostNames[0] = "registry-auth.'$DOMAIN'"')
    else
        REG_VALUES=$(echo "$REG_VALUES" | /usr/local/bin/yq eval 'del(.components[0].hostAliases)')
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
    MDOS_URL=\"http://mdos-api-http.mdos.svc.cluster.local:3030\"
    MDOS_HEAD=\"\$(wget -S --spider \$MDOS_URL 2>&1 | grep 'HTTP/1.1 200 OK')\"
    if [ \"\$MDOS_HEAD\" == \"\" ]; then
        exit 0
    else
        BCREDS=\$(echo '{ \"username\": \"'\$u'\", \"password\": \"'\$p'\" }' | base64 -w 0)
        RESULT=\$(wget -O- --header=\"Accept-Encoding: gzip, deflate\" \$MDOS_URL/reg-authentication?creds=\$BCREDS)
        if [ \$? -ne 0 ]; then
            exit 1
        else
            exit 0
        fi
    fi
fi
EOL

    fi
    REG_VALUES=$(echo "$REG_VALUES" | /usr/local/bin/yq '.components[1].configs[1].entries[0].value = "'"$(< ./authentication.sh)"'"')
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

MDOS_URL=\"http://mdos-api-http.mdos.svc.cluster.local:3030\"
MDOS_HEAD=\"\$(wget -S --spider \$MDOS_URL 2>&1 | grep 'HTTP/1.1 200 OK')\"
if [ \"\$MDOS_HEAD\" == \"\" ]; then
    exit 0
else
    BCREDS=\$(echo \"\$a\" | base64 -w 0)
    RESULT=\$(wget -O- --header=\"Accept-Encoding: gzip, deflate\" \$MDOS_URL/reg-authorization?data=\$BCREDS)
    if [ \$? -ne 0 ]; then
        exit 1
    else
        exit 0
    fi
fi
EOL
    fi
    REG_VALUES=$(echo "$REG_VALUES" | /usr/local/bin/yq '.components[1].configs[1].entries[1].value = "'"$(< ./authorization.sh)"'"')
    rm -rf ./authorization.sh

    printf "$REG_VALUES\n" > ./target_values.yaml
    mdos_deploy_app "false" "false"
    rm -rf ./target_values.yaml
}

# ############################################
# ################# KEYCLOAK #################
# ############################################
install_keycloak() {
    # Compute remaining parameters
    POSTGRES_USER=$KEYCLOAK_USER
    POSTGRES_PASSWORD=$KEYCLOAK_PASS
    KEYCLOAK_DB_SCRIPT_MOUNT=$(pwd)/dep/keycloak/pg-init-scripts
    
    # Create / update keycloak values.yaml file
    KEYCLOAK_VAL=$(cat ./dep/keycloak/values.yaml)

    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.registry = "registry.'$DOMAIN'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.mdosRegistry = "registry.'$DOMAIN'"')

    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.components[0].volumes[0].size = "'$KEYCLOAK_VOLUME_SIZE'Gi"')

    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.components[0].secrets[0].entries[0].value = "'$POSTGRES_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.components[0].secrets[0].entries[1].value = "'$POSTGRES_PASSWORD'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.components[0].secrets[0].entries[2].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.components[0].secrets[0].entries[3].value = "'$KEYCLOAK_PASS'"')
    
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.components[1].ingress[0].matchHost = "keycloak.'$DOMAIN'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.components[1].secrets[0].entries[0].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.components[1].secrets[0].entries[1].value = "'$KEYCLOAK_PASS'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.components[1].secrets[0].entries[2].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | /usr/local/bin/yq '.components[1].secrets[0].entries[3].value = "'$KEYCLOAK_PASS'"')

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
            "https://keycloak.$DOMAIN:30999/realms/master/protocol/openid-connect/token" \
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
            https://keycloak.$DOMAIN:30999/admin/realms \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            -d '{"id": "'$REALM'","realm": "'$REALM'","rememberMe": true, "enabled": true}'

        # Create mdos client
        gen_api_token
        curl -k -s --request POST \
            https://keycloak.$DOMAIN:30999/admin/realms/$REALM/clients \
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
            https://keycloak.$DOMAIN:30999/admin/realms/$REALM/clients?clientId=$CLIENT_ID | jq '.[0].id' | sed 's/[\"]//g')

        # Get mdos client secret
        MDOS_CLIENT_SECRET=$(curl -k -s --location --request GET \
            https://keycloak.$DOMAIN:30999/admin/realms/$REALM/clients/$MDOS_CLIENT_UUID/client-secret \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" | jq '.value' | sed 's/[\"]//g')

        # Create admin user
        gen_api_token
        curl -k -s --request POST \
            https://keycloak.$DOMAIN:30999/admin/realms/$REALM/users \
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
            https://keycloak.$DOMAIN:30999/admin/realms/$REALM/users \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" | jq '.[0].id' | sed 's/[\"]//g')

        # Set admin user password
        curl -s -k --request PUT \
            https://keycloak.$DOMAIN:30999/admin/realms/$REALM/users/$MDOS_USER_UUID/reset-password \
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
                https://keycloak.$DOMAIN:30999/admin/realms/$REALM/clients/$MDOS_CLIENT_UUID/roles

            # Create client role mapping for mdos admin user
            if [ ! -z $2 ]; then
                gen_api_token

                # Get mdos admin role UUID
                ROLE_UUID=$(curl -s -k --request GET \
                    -H "Accept: application/json" \
                    -H "Content-Type:application/json" \
                    -H "Authorization: Bearer $KC_TOKEN" \
                    https://keycloak.$DOMAIN:30999/admin/realms/$REALM/clients/$MDOS_CLIENT_UUID/roles/$1 | jq '.id' | sed 's/[\"]//g')

                curl -s -k --request POST \
                    -H "Accept: application/json" \
                    -H "Content-Type:application/json" \
                    -H "Authorization: Bearer $KC_TOKEN" \
                    -d '[{"id":"'$ROLE_UUID'","name":"'$1'"}]' \
                    https://keycloak.$DOMAIN:30999/admin/realms/$REALM/users/$2/role-mappings/clients/$MDOS_CLIENT_UUID
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
        createMdosRole "cm-cluster-issuer"

        # Create secret with credentials
        cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
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

    # Pull & push images to registry
    docker pull postgres:13.2-alpine &>> $LOG_FILE
    docker tag postgres:13.2-alpine registry.$DOMAIN/postgres:13.2-alpine &>> $LOG_FILE

    # Registry might need some time to be up and ready, we therefore loop untill success for first push
    failsafe_docker_push registry.$DOMAIN/postgres:13.2-alpine

    docker pull quay.io/keycloak/keycloak:18.0.2 &>> $LOG_FILE
    docker tag quay.io/keycloak/keycloak:18.0.2 registry.$DOMAIN/keycloak:18.0.2 &>> $LOG_FILE
    failsafe_docker_push registry.$DOMAIN/keycloak:18.0.2
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
    $helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests &>> $LOG_FILE
    $helm repo update &>> $LOG_FILE
    $kubectl create ns oauth2-proxy &>> $LOG_FILE
    $kubectl label ns oauth2-proxy istio-injection=enabled &>> $LOG_FILE

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

    if [ ! -z $NO_DNS ]; then
        echo "hostAlias:
  enabled: true
  ip: \"$LOCAL_IP\"
  hostname: \"keycloak.$DOMAIN\"" >> $_DIR/oauth2-proxy-values.yaml
    fi

    $helm upgrade --install -n oauth2-proxy \
      --version 6.2.7 \
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
    cp infra/dep/helm/helm .
    cp infra/dep/kubectl/kubectl .
    DOCKER_BUILDKIT=1 docker build -t registry.$DOMAIN/mdos-api:latest . &>> $LOG_FILE
    rm -rf helm
    rm -rf kubectl
    failsafe_docker_push registry.$DOMAIN/mdos-api:latest

    # Build lftp image
    cd ../mdos-setup/dep/images/docker-mirror-lftp
    DOCKER_BUILDKIT=1 docker build -t registry.$DOMAIN/mdos-mirror-lftp:latest . &>> $LOG_FILE
    failsafe_docker_push registry.$DOMAIN/mdos-mirror-lftp:latest
    cd ../../..

    # Deploy mdos-api server
    MDOS_VALUES="$(cat ./dep/mdos-api/values.yaml)"

    K3S_REG_DOMAIN="registry.$DOMAIN"

    if [ ! -z $NO_DNS ]; then
        MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].hostAliases[0].ip = "'$LOCAL_IP'"')
        MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].hostAliases[0].hostNames[0] = "mdos-ftp-api.'$DOMAIN'"')
    else
        MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq eval 'del(.components[0].hostAliases)')
    fi

    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.registry = "'$K3S_REG_DOMAIN'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].ingress[0].matchHost = "mdos-api.'$DOMAIN'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].configs[0].entries[0].value = "'$DOMAIN'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].secrets[0].entries[0].value = "'$KEYCLOAK_USER'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].secrets[0].entries[1].value = "'$KEYCLOAK_PASS'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].secrets[1].entries[0].value = "'"$(< /var/lib/rancher/k3s/server/tls/client-ca.crt)"'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].secrets[1].entries[1].value = "'"$(< /var/lib/rancher/k3s/server/tls/client-ca.key)"'"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].volumes[0].hostPath = "'$_DIR'/dep/mhc-generic/chart"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].volumes[1].hostPath = "'$_DIR'/dep/istio_helm/istio-control/istio-discovery"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].oidc.issuer = "https://keycloak.'$DOMAIN':30999/realms/mdos"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].oidc.jwksUri = "https://keycloak.'$DOMAIN':30999/realms/mdos/protocol/openid-connect/certs"')
    MDOS_VALUES=$(echo "$MDOS_VALUES" | /usr/local/bin/yq '.components[0].oidc.hosts[0] = "mdos-api.'$DOMAIN'"')
    
    printf "$MDOS_VALUES\n" > ./target_values.yaml

    mdos_deploy_app "true" "false"

    rm -rf ./target_values.yaml
}

# ############################################
# ############# INSTALL RABBITMQ #############
# ############################################
install_rabbitmq() {
    $helm repo add bitnami https://charts.bitnami.com/bitnami &>> $LOG_FILE
    $helm install rabbit-operator bitnami/rabbitmq-cluster-operator --namespace rabbitmq --create-namespace --atomic &>> $LOG_FILE

    # Wait untill available
    unset LOOP_BREAK
    while [ -z $LOOP_BREAK ]; do
        DEP_STATUS=$($kubectl get deploy rabbit-operator-rabbitmq-cluster-operator --namespace rabbitmq -o json | jq -r '.status.availableReplicas')
        if [ "$DEP_STATUS" == "1" ]; then
            DEP_STATUS=$($kubectl get deploy rabbit-operator-rabbitmq-messaging-topology-operator --namespace rabbitmq -o json | jq -r '.status.availableReplicas')
            if [ "$DEP_STATUS" == "1" ]; then
                LOOP_BREAK=1
            else
                sleep 2
            fi
        else
            sleep 2
        fi
    done 

    # Instantiate cluster
    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq-cluster
  namespace: rabbitmq
spec:
  replicas: 1
  override:
    statefulSet:
      spec:
        podManagementPolicy: OrderedReady
  service:
    type: NodePort
  persistence:
    storageClassName: longhorn
    storage: ${RABBIT_MQ_VOLUME_SIZE}Gi
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values:
              - rabbitmq-cluster
        topologyKey: kubernetes.io/hostname
  rabbitmq:
    additionalPlugins:
    - rabbitmq_federation
    additionalConfig: |
      disk_free_limit.absolute = 500MB
      vm_memory_high_watermark.relative = 0.6
EOF

    # Wait for pod rabbitmq-cluster-server-0
    unset LOOP_BREAK
    while [ -z $LOOP_BREAK ]; do
        DEP_STATUS=$($kubectl get pod rabbitmq-cluster-server-0 --namespace rabbitmq -o json 2> $LOG_FILE | jq -r '.status.phase')
        if [ "$DEP_STATUS" == "Running" ]; then
            LOOP_BREAK=1
        else
            sleep 2
        fi
    done 

    # Copy credentials secret over to mdos namespace
    SECRET_YAML=$($kubectl get secret rabbitmq-cluster-default-user -n rabbitmq -o yaml | grep -v '^\s*namespace:\s' | grep -v '^\s*creationTimestamp:\s' | grep -v '^\s*resourceVersion:\s' | grep -v '^\s*uid:\s')
    SECRET_YAML=$(echo "$SECRET_YAML" | /usr/local/bin/yq eval 'del(.metadata.ownerReferences)')
    SECRET_YAML=$(echo "$SECRET_YAML" | /usr/local/bin/yq eval 'del(.metadata.labels)')
    cat <<EOF | $kubectl apply -n mdos -f &>> $LOG_FILE -
$SECRET_YAML
EOF
}

# ############################################
# ############ COREDNS DOMAIN CFG ############
# ############################################
consigure_core_dns_for_self_signed() {
    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
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
   
    sleep 1
    # Restart the CoreDNS pod
    restart_coredns
    sleep 2
    
    unset FOUND_RUNNING_POD
    while [ -z $FOUND_RUNNING_POD ]; do
        while read POD_LINE ; do
            POD_STATUS=`echo "$POD_LINE" | awk 'END {print $3}'`
            if [ "$POD_STATUS" == "Running" ]; then
                FOUND_RUNNING_POD=1
            fi
        done < <($kubectl get pods -n kube-system | grep "coredns" 2>/dev/null)
        sleep 1
    done
}

# ############################################
# ########### INSTALL HELM FTP REG ###########
# ############################################
install_helm_ftp() {
    C_DIR="$(pwd)"
    
    # Build mdos-api image
    cd ../mdos-ftp
    DOCKER_BUILDKIT=1 docker build -t registry.$DOMAIN/mdos-ftp-bot:latest . &>> $LOG_FILE

    failsafe_docker_push registry.$DOMAIN/mdos-ftp-bot:latest

    cd ../mdos-setup

    mkdir -p $HOME/.mdos/pure-ftpd/passwd
    cp ./dep/pure-ftpd/docker-compose.yaml $HOME/.mdos/pure-ftpd
    cd $HOME/.mdos/pure-ftpd

    FTP_DOCKER_COMPOSE_VAL="$(cat ./docker-compose.yaml)"
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | /usr/local/bin/yq '.services.mdos_ftpd_server.image = "registry.'$DOMAIN'/mdos-ftp-bot:latest"')
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | /usr/local/bin/yq '.services.mdos_ftpd_server.volumes[0] = "'$FTP_DATA_HOME':/home/ftp_data/"')
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | /usr/local/bin/yq '.services.mdos_ftpd_server.volumes[1] = "'$HOME'/.mdos/pure-ftpd/passwd:/etc/pure-ftpd/passwd"')
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | /usr/local/bin/yq '.services.mdos_ftpd_server.volumes[2] = "'$SSL_ROOT'/'$FULLCHAIN_FNAME':/etc/ssl/private/pure-ftpd-cert.pem"')
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | /usr/local/bin/yq '.services.mdos_ftpd_server.volumes[3] = "'$SSL_ROOT'/'$PRIVKEY_FNAME':/etc/ssl/private/pure-ftpd-key.pem"')
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | /usr/local/bin/yq '.services.mdos_ftpd_server.environment.M2M_USER = "'$KEYCLOAK_USER'"')
    FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | /usr/local/bin/yq '.services.mdos_ftpd_server.environment.M2M_PASSWORD = "'$KEYCLOAK_PASS'"')
    
    if [ ! -z $NO_DNS ]; then
        FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | /usr/local/bin/yq '.services.mdos_ftpd_server.environment.PUBLICHOST = "'$LOCAL_IP'"')
    else
        FTP_DOCKER_COMPOSE_VAL=$(echo "$FTP_DOCKER_COMPOSE_VAL" | /usr/local/bin/yq '.services.mdos_ftpd_server.environment.PUBLICHOST = "mdos-ftp.'$DOMAIN'"')
    fi

    printf "$FTP_DOCKER_COMPOSE_VAL\n" > ./docker-compose.yaml

    docker compose up -d &>> $LOG_FILE

    # Install endpoint to use K3S ingress for this
    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
apiVersion: v1
kind: Service
metadata:
  name: ftpd-bot-service-egress
  namespace: mdos
  labels:
    app: ftpd-bot
spec:
   clusterIP: None
   ports:
   - protocol: TCP
     port: 3039
     targetPort: 3039
   type: ClusterIP
---
apiVersion: v1
kind: Endpoints
metadata:
  name: ftpd-bot-service-egress
  namespace: mdos
  labels:
    app: ftpd-bot
subsets:
  - addresses:
    - ip: $LOCAL_IP
    ports:
      - port: 3039
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ftpd-bot
  namespace: mdos
  labels:
    app: ftpd-bot
spec:
  gateways:
  - mdos/https-gateway
  hosts:
  - mdos-ftp-api.$DOMAIN
  http:
  - match:
    - port: 443
    route:
    - destination:
        host: ftpd-bot-service-egress.mdos.svc.cluster.local
        port:
          number: 3039
EOF

    cd $C_DIR
}

# ############################################
# ############ INSTALL LOKI STACK ############
# ############################################
install_loki_stack() {
    $helm repo add grafana https://grafana.github.io/helm-charts &>> $LOG_FILE
    $helm repo update &>> $LOG_FILE

    $kubectl create ns loki-stack &>> $LOG_FILE

    LOKI_CONFIG="auth_enabled: false
chunk_store_config:
  max_look_back_period: 0s
compactor:
  shared_store: filesystem
  working_directory: /data/loki/boltdb-shipper-compactor
ingester:
  chunk_block_size: 262144
  chunk_idle_period: 3m
  chunk_retain_period: 1m
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  max_transfer_retries: 0
  wal:
    dir: /data/loki/wal
limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
schema_config:
  configs:
  - from: \"2020-10-24\"
    index:
      period: 24h
      prefix: index_
    object_store: filesystem
    schema: v11
    store: boltdb-shipper
server:
  http_listen_port: 3100
storage_config:
  boltdb_shipper:
    active_index_directory: /data/loki/boltdb-shipper-active
    cache_location: /data/loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /data/loki/chunks
table_manager:
  retention_deletes_enabled: true
  retention_period: 168h"

    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
apiVersion: v1
data:
  loki.yaml: $(echo -n "$LOKI_CONFIG" | base64 -w 0)
kind: Secret
metadata:
  name: loki-config
  namespace: loki-stack
type: Opaque
EOF

    $helm upgrade --install loki --namespace=loki-stack grafana/loki-stack --version 2.6.0 \
        --set loki.persistence.enabled=true \
        --set loki.persistence.size="${LOKI_VOLUME_SIZE}Gi" \
        --set loki.persistence.storageClassName="longhorn" \
        --set loki.existingSecretForConfig="loki-config" \
        --set grafana.enabled=true \
        --set grafana.adminUser="$KEYCLOAK_USER" \
        --set grafana.adminPassword="$KEYCLOAK_PASS" \
        --atomic &>> $LOG_FILE

    cat <<EOF | $kubectl apply -f &>> $LOG_FILE -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  labels:
    app: grafana-ui
  name: grafana-ui-ingress
  namespace: loki-stack
spec:
  gateways:
  - mdos/https-gateway
  hosts:
  - grafana.$DOMAIN
  http:
  - name: grafana-ui-ingress
    route:
    - destination:
        host: loki-grafana.loki-stack.svc.cluster.local
        port:
          number: 80
EOF
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
        if [ -z $EARLY_EXIT ]; then
            info "Cleaning up..."
        fi

        set +Ee
        IN_CLEANUP=1

        if [ -f $_DIR/dep/longhorn/chart/values_backup.yaml ]; then
            rm -rf cp $_DIR/dep/longhorn/chart/values.yaml
            mv $_DIR/dep/longhorn/chart/values_backup.yaml $_DIR/dep/longhorn/chart/values.yaml
        fi
        
        ALL_IMAGES="$(docker images)"

        if [ "$(echo "$ALL_IMAGES" | grep "nginx" | grep "latest" | awk '{print $1}')" == "nginx" ]; then
            docker rmi nginx:latest &>> $LOG_FILE
        fi

        rm -rf $_DIR/istiod-values.yaml
        rm -rf $_DIR/oauth2-proxy-values.yaml
        rm -rf $_DIR/dep/images/cert-job-manager/cert-manager-replicate-bot.tar

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
            
            if [ "$CERT_MODE" == "SELF_SIGNED" ] || [ ! -z $PROV_CERT_IS_SELFSIGNED ]; then
                if [ -z $GLOBAL_ERROR ]; then
                    warn "You choose to generate a self signed certificate for this installation."
                    echo "      All certificates are located under the folder $SSL_ROOT."
                    echo "      You can use those certificates to allow your external tools to"
                    echo "      communicate with the platform (ex. docker)."
                    echo ""
                    echo "      Self-signed certificates also impose limitations, the most significant"
                    echo "      one being the inability to use OIDC authentication on your applications."
                    echo ""
                    echo "      To talk to your platform from an environement other than this one, you will"
                    echo "      also need to configure your 'hosts' file in that remote environement with"
                    echo "      the following resolvers:"
                    echo "          <MDOS_VM_IP> mdos-api.$DOMAIN"
                    echo "          <MDOS_VM_IP> mdos-ftp-api.$DOMAIN"
                    echo "          <MDOS_VM_IP> mdos-ftp.$DOMAIN"
                    echo "          <MDOS_VM_IP> registry.$DOMAIN"
                    echo "          <MDOS_VM_IP> registry-auth.$DOMAIN"
                    echo "          <MDOS_VM_IP> keycloak.$DOMAIN"
                    echo "          <MDOS_VM_IP> longhorn.$DOMAIN"
                    echo "          <MDOS_VM_IP> grafana.$DOMAIN"
                    echo ""
                fi
            fi
            if [ -z $GLOBAL_ERROR ]; then
                info "The following services are available on the platform:"
                echo "          - mdos-api.$DOMAIN"
                echo "          - mdos-ftp-api.$DOMAIN"
                echo "          - mdos-ftp.$DOMAIN:3915-3920"
                echo "          - registry.$DOMAIN"
                echo "          - registry-auth.$DOMAIN"
                echo "          - keycloak.$DOMAIN:30999"
                echo "          - longhorn.$DOMAIN"
                echo "          - grafana.$DOMAIN"
                echo ""
                echo "      You will have to allow inbound traffic on the following ports:"
                echo "          - 443 (HTTPS traffic for the MDos API)"
                echo "          - 6443 (HTTPS traffic for Kubernetes API server)"
                echo "          - 30999 (HTTPS traffic for Keycloak OIDC Oauth2 FLow)"
                echo "          - 3915:3920 (TCP - FTP PSV traffic)"
            fi
        fi

        if [ -z $EARLY_EXIT ]; then
            note_print "Log details of the installation can be found here: $LOG_FILE"

            if [ -z $GLOBAL_ERROR ]; then
                info "Done!"
            fi
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

    # Make sure we have connectivity to the internet from docker
    info "Testing connectivity from Docker daemon..."
    docker_internet_check

    # Set up firewall
    init_firewall

    # COLLECT USER DATA
    collect_user_input

    echo ""
    warn_print "Installation"
    warn_print "====================================="

    # PREPARE CERTIFICATES & DOMAIN
    if [ "$CERT_MODE" == "CERT_MANAGER" ]; then
        SSL_ROOT=/etc/letsencrypt/live/$DOMAIN
        FULLCHAIN_FNAME=fullchain.pem
        PRIVKEY_FNAME=privkey.pem
    elif [ "$CERT_MODE" == "CRT_PROVIDED" ]; then
        SSL_ROOT="$(dirname "${OWN_FULLCHAIN_CRT_PATH}")"
        FULLCHAIN_FNAME=$(basename "${OWN_FULLCHAIN_CRT_PATH}")
        PRIVKEY_FNAME=$(basename "${OWN_PRIVKEY_PATH}")
        if [ ! -z $PROV_CERT_IS_SELFSIGNED ]; then
            configure_etc_hosts
        fi
    else
        SSL_ROOT=/etc/letsencrypt/live/$DOMAIN
        FULLCHAIN_FNAME=fullchain.pem
        PRIVKEY_FNAME=privkey.pem

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

    # MAKE SURE WE SET THE ALIASES
    set -Ee
    if ! command -v k3s >/dev/null; then
        k3s="/usr/local/bin/k3s"
    else
        k3s=$(whereis k3s | cut -d: -f2 | xargs)
    fi
    if ! command -v kubectl >/dev/null; then
        kubectl="/usr/local/bin/kubectl"
    else
        kubectl=$(whereis kubectl | cut -d: -f2 | xargs)
    fi
    set +Ee

    # SETUP FIREWALL
    if [ -z $SETUP_FIREWALL_RULES ]; then
        setup_master_firewall
        set_env_step_data "SETUP_FIREWALL_RULES" "1"
    fi

    # Make sure we have connectivity to within the cluster
    info "Testing connectivity from Kubernetes PODs..."
    kube_internet_check CON_SUCCESS &>> $LOG_FILE
    if [ "$CON_SUCCESS" == "1" ]; then
        error "Your kubernetes cluster PODs dont seem to have internet connectivity."
        exit 1
    fi

    # IF SELF SIGNED, ADD CUSTOM CORE-DNS CONFIG
    if [ "$CERT_MODE" == "SELF_SIGNED" ] || [ ! -z $PROV_CERT_IS_SELFSIGNED ]; then
        consigure_core_dns_for_self_signed
    fi

    # INSTALL HELM
    if [ -z $INST_STEP_HELM ]; then
        info "Installing HELM..."
        install_helm
        set_env_step_data "INST_STEP_HELM" "1"
    fi

    # MAKE SURE WE SET THE ALIAS
    set -Ee
    if ! command -v helm >/dev/null; then
        helm="/usr/local/bin/helm"
    else
        helm=$(whereis helm | cut -d: -f2 | xargs)
    fi
    set +Ee

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

    # PREPARE NAMESPACES
    if [ -z $SETUP_PREP_NS ]; then
        info "Preparing namespaces..."
        prepare_namespaces
        set_env_step_data "SETUP_PREP_NS" "1"
    fi

    # INSTALL CERT-MANAGER
    if [ -z $SETUP_CERT_MANAGER ]; then
        info "Install cert-manager..."
        setup_cert_manager
        set_env_step_data "SETUP_CERT_MANAGER" "1"
    fi

    # INSTALL CERT-MANAGER ISSUER FOR MDOS IF NECESSARY
    if [ -z $SETUP_CERT_MANAGER_ISSUER ] && [ "$CERT_MODE" == "CERT_MANAGER" ]; then
        cert_manager_mdos_issuer_and_crt_secret
        set_env_step_data "SETUP_CERT_MANAGER_ISSUER" "1"
    fi

    # SETUP MDOS SECRET BOT REPLICATOR
    if [ -z $INST_STEP_SEC_BOT_REP ]; then
        info "Configure certificate secret replication jobs..."
        mdos_secret_replicator_job
        set_env_step_data "INST_STEP_SEC_BOT_REP" "1"
    fi

    # SETUP ISTIO GATEWAYS
    if [ -z $SETUP_ISTIO_GATEWAYS ]; then
        deploy_istio_gateways
        set_env_step_data "SETUP_ISTIO_GATEWAYS" "1"
    fi

    # SETUP LONGHORN VS
    if [ -z $INST_STEP_LONGHORN_VS ]; then
        info "Setup Longhorn virtual service..."
        setup_longhorn_vs
        set_env_step_data "INST_STEP_LONGHORN_VS" "1"
    fi

    # INSTALL LOKI
    if [ -z $INST_STEP_LOKI ]; then
        info "Install Locki-Stack..."
        install_loki_stack
        set_env_step_data "INST_STEP_LOKI" "1"
    fi

    # INSTALL REGISTRY
    if [ -z $INST_STEP_REGISTRY ]; then
        info "Install Registry..."
        install_registry
        set_env_step_data "INST_STEP_REGISTRY" "1"
    fi

    # LOGIN TO PRIVATE REGISTRY
    failsafe_docker_login

    # PUSH CERT MANAGER REPLICA BOT IMG TO REGISTRY
    if [ -z $INST_STEP_SEC_BOT_REP_IMG_PUSH ]; then
        info "Pushing cert-manager secret replication image to registry..."
        cert_manager_secret_replicator_reg_push
        set_env_step_data "INST_STEP_SEC_BOT_REP_IMG_PUSH" "1"
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
    if [ "$CERT_MODE" == "SELF_SIGNED" ] || [ ! -z $PROV_CERT_IS_SELFSIGNED ]; then
        OIDC_DISCOVERY=$(curl -s -k "https://keycloak.${DOMAIN}:30999/realms/mdos/.well-known/openid-configuration")
        OIDC_ISSUER_URL=$(echo $OIDC_DISCOVERY | jq -r .issuer)
        OIDC_JWKS_URI=$(echo $OIDC_DISCOVERY | jq -r .jwks_uri) 
        OIDC_USERINPUT_URI=$(echo $OIDC_DISCOVERY | jq -r .userinfo_endpoint)
        COOKIE_SECRET=$(openssl rand -base64 32 | tr -- '+/' '-_')
       
        OIDC_ISSUER_URL=${OIDC_ISSUER_URL//$KC_NODEPORT/}
        OIDC_JWKS_URI=${OIDC_JWKS_URI//$KC_NODEPORT/}
        OIDC_USERINPUT_URI=${OIDC_USERINPUT_URI//$KC_NODEPORT/}
    else
        OIDC_DISCOVERY=$(curl -s -k "https://keycloak.$DOMAIN:30999/realms/mdos/.well-known/openid-configuration")
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

    # INSTALL RABBITMQ
    if [ -z $INST_STEP_RABBITMQ ]; then
        info "Install RabbitMQ..."
        install_rabbitmq
        set_env_step_data "INST_STEP_RABBITMQ" "1"
    fi

    # INSTALL MDOS
    if [ -z $INST_STEP_MDOS ]; then
        info "Install MDos API server..."
        install_mdos
        set_env_step_data "INST_STEP_MDOS" "1"
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