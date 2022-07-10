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

while [ "$1" != "" ]; do
    case $1 in
        --platform-user )
            shift
            PLATFORM_USER=$1
        ;; 
        --reg-host )
            shift
            REGISTRY_HOST=$1
        ;; 
        --reg-cred-b64 )
            shift
            REG_CREDS_B64=$1
        ;; 
        --skip-local-registry )
            SKIP_REG=true
        ;; 
        * )              echo "Invalid parameter detected => $1"
            exit 1
    esac
    shift
done

if [ -z $PLATFORM_USER ]; then
    echo "Missing param --platform-user"
    exit 1
fi
if [ -z $REGISTRY_HOST ]; then
    echo "Missing param --reg-host"
    exit 1
fi
if [ -z $REG_CREDS_B64 ]; then
    echo "Missing param --reg-cred-b64"
    exit 1
fi

# ############################################
# ################## SYSTEM ##################
# ############################################

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

# ############################################
# ############## REGISTRY PREP ###############
# ############################################

if [[ $REGISTRY_HOST == *":"* ]]; then
  IFS=':' read -r -a REG_SPLIT <<< "$REGISTRY_HOST"
  REGISTRY_HOST_STRIPPED="${REG_SPLIT[0]}"
else
  REGISTRY_HOST_STRIPPED=$REGISTRY_HOST
fi

 # Extract the credentials from the base64 string
B64_DECODED=$(echo $REG_CREDS_B64 | base64 --decode)
IFS=':' read -r -a CREDS <<< "$B64_DECODED"
REG_USER="${CREDS[0]}"
REG_PASS="${CREDS[1]}"

# Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install docker-ce docker-ce-cli containerd.io

groupadd docker
usermod -aG docker $PLATFORM_USER

# Skip registry setup if certificate already there
if [ -f /home/$PLATFORM_USER/registry/certs/$REGISTRY_HOST_STRIPPED.crt ]; then
  SKIP_REG=true
fi

if [ -z $SKIP_REG ]; then
  # Create registry self signed certificate- for local domain
  su $PLATFORM_USER -c 'mkdir -p /home/'"$PLATFORM_USER"'/registry/auth'

  # Create credentials file for the registry
  cd /home/$PLATFORM_USER/registry
  
  htpasswd -Bbn $REG_USER $REG_PASS > auth/htpasswd

  # Get local IP
  LOC_IP=$(ip addr show enp0s25 | grep "inet\b" | awk '{print $2}' | cut -d/ -f1)

  # Update hosts file to resolve registry domain
  echo "$LOC_IP $REGISTRY_HOST_STRIPPED" | tee -a /etc/hosts > /dev/null

  # Create registry self signed certificate for local domain 
  su $PLATFORM_USER -c 'mkdir -p /home/'"$PLATFORM_USER"'/registry/certs'
  cd /home/$PLATFORM_USER/registry

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
O = mdundek
OU = mdundek.home
CN = $REGISTRY_HOST_STRIPPED
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = $REGISTRY_HOST_STRIPPED" > ./certs/config.cfg
  /usr/bin/docker run -v /home/$PLATFORM_USER/registry/certs:/export -i nginx:latest openssl req -new -nodes -x509 -days 365 -keyout /export/$REGISTRY_HOST_STRIPPED.key -out /export/$REGISTRY_HOST_STRIPPED.crt -config /export/config.cfg
  chown -R $PLATFORM_USER:$PLATFORM_USER /home/$PLATFORM_USER/registry/certs

  # Configure self signed cert with local docker deamon
  mkdir -p /etc/docker/certs.d/$REGISTRY_HOST
  cp /home/$PLATFORM_USER/registry/certs/$REGISTRY_HOST_STRIPPED.crt /etc/docker/certs.d/$REGISTRY_HOST/ca.crt
  cp -R /etc/docker/certs.d/$REGISTRY_HOST /etc/docker/certs.d/$REGISTRY_HOST_STRIPPED:443

  # Prepare k3s registry SSL containerd config
  mkdir -p /etc/rancher/k3s
  echo "mirrors:
  $REGISTRY_HOST:
    endpoint:
      - \"https://$REGISTRY_HOST\"
configs:
  \"$REGISTRY_HOST\":
    auth:
      username: $REG_USER
      password: $REG_PASS
    tls:
      cert_file: /home/$PLATFORM_USER/registry/certs/$REGISTRY_HOST_STRIPPED.crt
      key_file: /home/$PLATFORM_USER/registry/certs/$REGISTRY_HOST_STRIPPED.key
      ca_file: /home/$PLATFORM_USER/registry/certs/$REGISTRY_HOST_STRIPPED.crt" > ./registries.yaml

  mv ./registries.yaml /etc/rancher/k3s/registries.yaml

  # Allow self signed cert registry for docker daemon
  echo "{
  \"insecure-registries\" : [\"$REGISTRY_HOST\"]
}" > ./daemon.json
  mv ./daemon.json /etc/docker/daemon.json

  mkdir -p /etc/docker/certs.d/$REGISTRY_HOST
  cp /home/$PLATFORM_USER/registry/certs/$REGISTRY_HOST_STRIPPED.crt /etc/docker/certs.d/$REGISTRY_HOST/ca.crt
  service docker restart
fi

# ############################################
# ################# FIREWALL #################
# ############################################

# Firewall
ufw allow ssh
ufw allow http
ufw allow https

ufw enable

# ############################################
# ################ DISK MOUNTS ###############
# ############################################

Create mount folders
mkdir /media/storage
mkdir /media/multimedia
mkdir /media/backup

# Get partition UUIDs
# lsblk -o NAME,FSTYPE,UUID

# Open fstab file
vi /etc/fstab

echo "UUID=5dd2af09-b490-43bf-a688-e8c5f6a557ef /media/storage ext4 defaults 0 2" >> /etc/fstab
echo "UUID=445d3106-669d-492e-b537-b444e9a666b2 /media/multimedia ext4 defaults 0 2" >> /etc/fstab
echo "UUID=67643a4b-4bb9-45b2-9530-838bb48deb05 /media/backup ext4 defaults 0 2" >> /etc/fstab

mount -a