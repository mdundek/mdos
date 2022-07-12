#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

while [ "$1" != "" ]; do
    case $1 in
        --storage-dir )
            shift
            STORAGE_DIR=$1
        ;; 
        * ) echo "Invalid parameter detected => $1"
            exit 1
    esac
    shift
done

if [ -z $STORAGE_DIR ]; then
  error "Missing parameter: --storage-dir"
fi

# Create target folder for storage class
mkdir -p $STORAGE_DIR

# Create specific storage class for backup
kubectl create ns minio-backup-storage-class

helm install minio-backup-storage-class \
  --set storageClass.name=local-path-minio-backup \
  --set nodePathMap[0].node=DEFAULT_PATH_FOR_NON_LISTED_NODES \
  --set nodePathMap[0].paths[0]=$STORAGE_DIR \
  ../files/local-path-provisioner \
  -n minio-backup-storage-class \
  --kubeconfig /etc/rancher/k3s/k3s.yaml

# Delete
# helm delete minio-backup-storage-class -n minio-backup-storage-class --kubeconfig /etc/rancher/k3s/k3s.yaml
# kubectl delete ns minio-backup-storage-class

# Create
kubectl create ns minio-backup

helm install minio-backup \
  --set persistence.enabled=true \
  --set persistence.storageClass=local-path-minio-backup \
  --set mode=standalone \
  --set resources.requests.memory=1Gi \
  --set rootUser=REp9k63uJ6qTe4KRtMsU \
  --set rootPassword=ePFRhVookGe1SX8u9boPHoNeMh2fAO5OmTjckzFN \
  minio/minio \
  -n minio-backup \
  --kubeconfig /etc/rancher/k3s/k3s.yaml
# ACCESS_KEY: REp9k63uJ6qTe4KRtMsU
# SECRET_KEY: ePFRhVookGe1SX8u9boPHoNeMh2fAO5OmTjckzFN

kubectl apply -f ../files/minio/virtualservice.yaml

# Delete
# helm delete minio-backup -n minio-backup --kubeconfig /etc/rancher/k3s/k3s.yaml
# kubectl delete -f ../files/minio/virtualservice.yaml
# kubectl delete ns minio-backup