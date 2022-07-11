#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "Please do not run as root"
  exit 1
fi

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

# https://mdundek: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@github.com/mdundek/mdundek.network.git

# Create namespace
kubectl create namespace istio-system

# Install base istio components
helm upgrade --install istio-base ../files/istio_helm/base --kubeconfig /etc/rancher/k3s/k3s.yaml -n istio-system
helm upgrade --install istiod ../files/istio_helm/istio-control/istio-discovery --kubeconfig /etc/rancher/k3s/k3s.yaml -n istio-system

## Deploy Istio Ingress
echo "==>  Deploy Istio Ingress..."

sed -i 's/type: LoadBalancer/type: NodePort/g' ../files/istio_helm/gateways/istio-ingress/values.yaml

helm upgrade --install istio-ingress ../files/istio_helm/gateways/istio-ingress --kubeconfig /etc/rancher/k3s/k3s.yaml -n istio-system

## Deploy Istio Gateways
cat <<EOF | k3s kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: http-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
---
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
    - "*"
    tls:
      mode: PASSTHROUGH
EOF

watch kubectl get pod -n istio-system