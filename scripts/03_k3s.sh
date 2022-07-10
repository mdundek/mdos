#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "Please do not run as root"
  exit 1
fi

# Install K3S
curl -sfL https://get.k3s.io | K3S_KUBECONFIG_MODE="644" INSTALL_K3S_EXEC="--flannel-backend=none --cluster-cidr=192.168.0.0/16 --disable-network-policy --disable=traefik --write-kubeconfig-mode=664" sh -

# Install Calico
kubectl create -f https://projectcalico.docs.tigera.io/manifests/tigera-operator.yaml
kubectl create -f https://projectcalico.docs.tigera.io/manifests/custom-resources.yaml

# Wait for all podds to be ready
watch kubectl get pod -A