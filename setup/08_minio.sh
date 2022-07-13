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

../cli/install/02_setup_env.sh --minio
source ../cli/.env


# ################################################
# ############ TRY CATCH INTERCEPTORS ############
# ################################################
(
    set -Ee

    function _catch {
        # Rollback
        error "An error occured"
        
    }

    function _finally {
        # Cleanup
        rm -rf $_DIR/local-path-provisioner
    }

    trap _catch ERR
    trap _finally EXIT
  
    # ############### EXECUTE ################
    # Create target folder for storage class
    mkdir -p $MINIO_STORAGE_DIR

    # Add minio HELM repository
    helm repo add minio https://charts.min.io/

    # Create specific storage class for backup
    kubectl create ns minio-backup-storage-class

    # Install storage class provisionner for local path
    git clone https://github.com/rancher/local-path-provisioner.git
    cd local-path-provisioner

    # Set up minio specific storage class
    helm install minio-backup-storage-class \
      --set storageClass.name=local-path-minio-backup \
      --set nodePathMap[0].node=DEFAULT_PATH_FOR_NON_LISTED_NODES \
      --set nodePathMap[0].paths[0]=$MINIO_STORAGE_DIR \
      ./deploy/chart/local-path-provisioner \
      -n minio-backup-storage-class \
      --kubeconfig /etc/rancher/k3s/k3s.yaml

    cd ..
    rm -rf local-path-provisioner

    # Create namespace
    kubectl create ns minio-backup

    # Install minio
    helm install minio-backup \
      --set persistence.enabled=true \
      --set persistence.storageClass=local-path-minio-backup \
      --set mode=standalone \
      --set resources.requests.memory=1Gi \
      --set rootUser=$MINIO_ACCESS_KEY \
      --set rootPassword=$MINIO_SECRET_KEY \
      minio/minio \
      -n minio-backup \
      --kubeconfig /etc/rancher/k3s/k3s.yaml

    # Create virtual service for minio
    cat <<EOF | k3s kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: minio-backup-console
  namespace: minio-backup
spec:
  gateways:
    - istio-system/http-gateway
  hosts:
    - minio-console.$DOMAIN
  http:
    - name: minio-backup-console
      route:
        - destination:
            host: minio-backup-console.minio-backup.svc.cluster.local
            port:
              number: 9001
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
    name: minio-backup
    namespace: minio-backup
spec:
    gateways:
        - istio-system/http-gateway
    hosts:
        - minio-backup.$DOMAIN
    http:
        - name: minio-backup
          route:
              - destination:
                    host: minio-backup.minio-backup.svc.cluster.local
                    port:
                        number: 9000
EOF
)