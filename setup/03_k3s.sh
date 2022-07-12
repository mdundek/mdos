#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit 1
fi

../cli/install/02_setup_env.sh --extended-registry
source ../cli/.env

# Preflight checks
if [ ! -f /etc/docker/certs.d/$REGISTRY_HOST/ca.crt ]; then
  ./80_prepare.sh
fi

# Install K3S
curl -sfL https://get.k3s.io | K3S_KUBECONFIG_MODE="644" INSTALL_K3S_EXEC="--flannel-backend=none --cluster-cidr=192.168.0.0/16 --disable-network-policy --disable=traefik --write-kubeconfig-mode=664" sh -

# Install Calico
kubectl create -f https://projectcalico.docs.tigera.io/manifests/tigera-operator.yaml
kubectl create -f https://projectcalico.docs.tigera.io/manifests/custom-resources.yaml

# Configure user K8S credentiald config file
PLATFORM_USER=mdundek
mkdir -p /home/$PLATFORM_USER/.kube
rm -rf /home/$PLATFORM_USER/.kube/config
cp /etc/rancher/k3s/k3s.yaml /home/$PLATFORM_USER/.kube/config
chown $PLATFORM_USER:$PLATFORM_USER /home/$PLATFORM_USER/.kube/config
sudo runuser -u $PLATFORM_USER -- chmod 600 /home/$PLATFORM_USER/.kube/config

# Wait for all podds to be ready
watch kubectl get pod -A
