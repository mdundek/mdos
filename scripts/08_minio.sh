#!/bin/bash

helm install minio-backup \
  --set persistence.existingClaim=minio-backup-claim \
  --set persistence.enabled=true \
  --set replicas=4 \
  --set resources.requests.memory=1Gi \
  minio/minio \
  -n minio-backup \
  --kubeconfig /etc/rancher/k3s/k3s.yaml

helm delete minio-backup -n minio-backup --kubeconfig /etc/rancher/k3s/k3s.yaml