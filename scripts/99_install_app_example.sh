#!/bin/bash

kubectl create ns nginx

helm upgrade --install nginx-test ./generic-helm-chart \
  --values ./generic-helm-chart/nginx_values.yaml \
  --kubeconfig /etc/rancher/k3s/k3s.yaml \
  -n nginx

helm delete nginx-test --kubeconfig /etc/rancher/k3s/k3s.yaml -n nginx