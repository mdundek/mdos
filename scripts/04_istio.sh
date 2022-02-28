#!/bin/bash

kubectl create namespace istio-system
helm upgrade --install istio-base ../files/istio_helm/base --kubeconfig /etc/rancher/k3s/k3s.yaml -n istio-system
