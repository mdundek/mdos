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

echo "
  __  __ ___   ___  ___ 
 |  \/  |   \ / _ \/ __|
 | |\/| | |) | (_) \__ \\
 |_|  |_|___/ \___/|___/
"     

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

# SET UP FIREWALL
if command -v ufw >/dev/null; then
    if [ "$(ufw status | grep 'Status: active')" == "" ]; then
        ufw enable
    fi
    if [ "$(ufw status | grep '22/tcp' | grep 'ALLOW')" == "" ]; then
        ufw allow ssh
    fi
    if [ "$(ufw status | grep '8080' | grep 'ALLOW')" == "" ]; then
        ufw allow from 192.168.0.0/16 to any port 8080
    fi
    if [ "$(ufw status | grep '30979' | grep 'ALLOW')" == "" ]; then
        ufw allow 30979
    fi
else
    warn "Configure your firewall to allow traffic on port 0.0.0.0:22, 0.0.0.0:30979 and 192.168.0.0/16:8080"
fi

# LOAD INSTALLATION TRACKING LOGS
INST_ENV_PATH="$HOME/.mdos/install.dat"
mkdir -p "$HOME/.mdos"
if [ -f $INST_ENV_PATH ]; then
    source $INST_ENV_PATH
fi

# ############### DEPENDENCIES ################
dependencies() {
    if [ "$PSYSTEM" == "APT" ]; then
        apt-get update -y
        apt-get upgrade -y
        apt-get install \
            jq \
            ca-certificates \
            curl \
            gnupg \
            apache2-utils \
            python3 \
            lsb-release -y
        snap install yq

        # Docker binary
        if [ "$DISTRO" == "Ubuntu" ]; then
            if ! command -v docker &> /dev/null; then
                curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

                echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
                    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

                apt-get update
                apt-get install docker-ce docker-ce-cli containerd.io -y

                groupadd docker

                warn "Docker has been installed. To use docker for non root users, use the following command: usermod -aG docker <USER>"
            fi
        fi
    fi
}

# ############### UPDATE ENV DATA VALUE ################
set_env_step_data() {
    sed -i '/'$1'=/d' $INST_ENV_PATH
    echo "$1=$2" >> $INST_ENV_PATH
}

# ############################################
# ########### CLOUDFLARE & CERTBOT ###########
# ############################################
setup_cloudflare_certbot() {
    if [ -z $INST_STEP_CLOUDFLARE ]; then
        if [ "$PSYSTEM" == "APT" ]; then
            # Install certbot
            apt-get install certbot python3-certbot-dns-cloudflare -y
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

        # Create certificate now (will require manual input)
        if [ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
            certbot certonly \
                --dns-cloudflare \
                --dns-cloudflare-credentials $HOME/.mdos/cloudflare.ini \
                -d $DOMAIN \
                -d *.$DOMAIN \
                --email $CF_EMAIL \
                --agree-tos \
                -n
        fi

        # Set up auto renewal of certificate (the script will be run as the user who created the crontab)
        if [ "$(crontab -l | grep '91_renew_certbot.sh')" == "" ]; then
            (crontab -l ; echo "5 8 * * * $_DIR/cron/91_renew_certbot.sh")| crontab -
        fi

        # Set up auto IP update on cloudflare (the script will be run as the user who created the crontab)
        if [ "$(crontab -l | grep '90_update_ip_cloudflare.sh')" == "" ]; then
            yes_no IP_UPDATE "Do you want to update your DNS records with your public IP address automatically in case it is not static?" 1
            if [ "$IP_UPDATE" == "yes" ]; then
                (crontab -l ; echo "5 6 * * * $_DIR/cron/90_update_ip_cloudflare.sh")| crontab -
            fi
        fi

        /etc/init.d/cron restart
    fi
}

# ############################################
# ################# ETC_HOSTS ################
# ############################################
configure_etc_hosts() {
    
    # # Get the default network interface in use to connect to the internet
    # host_ip=$(getent ahosts "google.com" | awk '{print $1; exit}')
    
    # # Get local IP
    # if [ "$PSYSTEM" == "APT" ]; then
    #     INETINTERFACE=$(ip route get "$host_ip" | grep -Po '(?<=(dev ))(\S+)')
    #     LOC_IP=$(ip addr show $INETINTERFACE | grep "inet\b" | awk '{print $2}' | cut -d/ -f1)
    # fi

    if [ "$(cat /etc/hosts | grep registry.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 registry.$DOMAIN" >> /etc/hosts
    fi

    if [ "$(cat /etc/hosts | grep keycloak.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 keycloak.$DOMAIN" >> /etc/hosts
    fi

    if [ "$(cat /etc/hosts | grep cs.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 cs.$DOMAIN" >> /etc/hosts
    fi
}

# ############################################
# ######## GENERATE SELF SIGNED CERT #########
# ############################################
generate_selfsigned() {
    if [ -z $INST_STEP_SS_CERT ]; then
        mkdir -p $HOME/.mdos/ss_cert

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
DNS.2 = *.$DOMAIN" > $HOME/.mdos/ss_cert/config.cfg
        /usr/bin/docker run -v $HOME/.mdos/ss_cert:/export -i nginx:latest openssl req -new -nodes -x509 -days 365 -keyout /export/$DOMAIN.key -out /export/$DOMAIN.crt -config /export/config.cfg
    fi
}

# ############ TRY CATCH INTERCEPTORS ############
(
    set -Ee

    function _catch {
        # Rollback
        echo ""
        error "An error occured"
        
    }

    function _finally {
        # Cleanup
        echo ""
        info "Done!"
    }

    trap _catch ERR
    trap _finally EXIT
  
    # ############### MAIN ################
    if [ -z $INST_STEP_DEPENDENCY ]; then
        dependencies
        set_env_step_data "INST_STEP_DEPENDENCY" "1"
    fi

    echo ""

    # WHAT CERT MODE
    OPTIONS_STRING="You already have a certificate and a wild card domain;You have a Cloudflare domain, but no certificates;Generate and use self signed, do not have a domain"
    OPTIONS_VALUES=("PROVIDE_ALL" "CLOUDFLARE" "SELF_SIGNED")
    set +Ee
    prompt_for_select CMD_SELECT "$OPTIONS_STRING"
    set -Ee
    for i in "${!CMD_SELECT[@]}"; do
        if [ "${CMD_SELECT[$i]}" == "true" ]; then
            CERT_MODE="${OPTIONS_VALUES[$i]}"
        fi
    done

    # TARGET SYSTEM USER
    if [ -z $PLATFORM_USER ]; then
        user_input PLATFORM_USER "Enter the default system user:" "$USER" 
        set_env_step_data "PLATFORM_USER" "$PLATFORM_USER"
    fi

    # PREPARE CERTIFICATES & DOMAIN
    if [ "$CERT_MODE" == "CLOUDFLARE" ]; then
        if [ -z $DOMAIN ]; then
            user_input DOMAIN "Enter your DNS root domain name (ex. mydomain.com):" 
            set_env_step_data "DOMAIN" "$DOMAIN"
        fi

        setup_cloudflare_certbot
        set_env_step_data "INST_STEP_CLOUDFLARE" "1"
    elif [ "$CERT_MODE" == "PROVIDE_ALL" ]; then
        error "Not implemented yet"
        exit 1
    else
        if [ -z $DOMAIN ]; then
            user_input DOMAIN "Enter your DNS root domain name (ex. mydomain.com):" 
            set_env_step_data "DOMAIN" "$DOMAIN"
        fi

        generate_selfsigned
        set_env_step_data "INST_STEP_SS_CERT" "1"

        configure_etc_hosts
    fi

    
    # if [ -z $REG_USER ] || [ -z $REG_PASS ]; then
    #     user_input REG_USER "Enter a registry username:"
    #     user_input REG_PASS "Enter a registry password:"
    #     REG_CREDS_B64=$(echo -n "$REG_USER:$REG_PASS" | base64 -w 0)
    #     set_env_step_data "REG_USER" "$REG_USER"
    #     set_env_step_data "REG_PASS" "$REG_PASS"
    #     set_env_step_data "REG_CREDS_B64" "$REG_CREDS_B64"
    # fi

    # INSTALL K3S
    if [ -z $INST_STEP_K3S ]; then
        if ! command -v k3s &> /dev/null; then
            curl -sfL https://get.k3s.io | K3S_KUBECONFIG_MODE="644" INSTALL_K3S_EXEC="--flannel-backend=none --cluster-cidr=192.168.0.0/16 --disable-network-policy --disable=traefik --write-kubeconfig-mode=664" sh -
            # Install Calico
            kubectl create -f https://projectcalico.docs.tigera.io/manifests/tigera-operator.yaml
            kubectl create -f https://projectcalico.docs.tigera.io/manifests/custom-resources.yaml

            # Configure user K8S credentiald config file
            mkdir -p /home/$USER/.kube
            rm -rf /home/$USER/.kube/config
            cp /etc/rancher/k3s/k3s.yaml /home/$USER/.kube/config
            chmod 600 /home/$USER/.kube/config

            info "Waiting for kubernetes to become ready..."
            ATTEMPTS=0
            while [ "$(kubectl get node | grep 'NotReady')" != "" ]; Do
                sleep 3
                ATTEMPTS=$((ATTEMPTS+1))
                if [ "$ATTEMPTS" -gt 100 ]; then
                    error "Timeout, Kubernetes did not come online, it is assumed there is a problem. Please check with the command kubectl get nodes and kubectl describe node <node name> for more information about the issue"
                    exit 1
                fi
            done
        fi
        set_env_step_data "INST_STEP_K3S" "1"
    fi
)