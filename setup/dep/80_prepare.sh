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

# Docker
./lib/81_install_docker.sh

# Firewall
ufw allow ssh
ufw allow 30979
ufw allow from 192.168.0.0/16 to any port 8080

ufw enable