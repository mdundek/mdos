#!/bin/bash

# https://mdundek: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@github.com/mdundek/mdundek.network.git

# Create namespace
kubectl create namespace istio-system

# Install base istio components
helm upgrade --install istio-base ../files/istio_helm/base --kubeconfig /etc/rancher/k3s/k3s.yaml -n istio-system
helm upgrade --install istiod ../files/istio_helm/istio-control/istio-discovery --kubeconfig /etc/rancher/k3s/k3s.yaml -n istio-system

## Prepare Istio Gateway
echo "==>  Prepare Istio Gateway..."

sed -i '/name: http2/a\      nodePort: 30978' ../files/istio_helm/gateways/istio-ingress/values.yaml
sed -i '/name: https/a\      nodePort: 30979' ../files/istio_helm/gateways/istio-ingress/values.yaml
sed -i '/name: status-port/a\      nodePort: 30977' ../files/istio_helm/gateways/istio-ingress/values.yaml

## Deploy Istio Ingress
echo "==>  Deploy Istio Ingress..."

helm upgrade --install istio-ingress ../files/istio_helm/gateways/istio-ingress --kubeconfig /etc/rancher/k3s/k3s.yaml -n istio-system

## Deploy Istio Gateways
echo "==>  Deploy Istio Gateways..."
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
EOF