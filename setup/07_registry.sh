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

../cli/install/02_setup_env.sh --extended-registry
source ../cli/.env

# Preflight checks
if [ ! -f /etc/docker/certs.d/$REGISTRY_HOST/ca.crt ]; then
  ./80_prepare.sh
fi

while [ "$1" != "" ]; do
    case $1 in
        --platform-user )
            shift
            PLATFORM_USER=$1
        ;; 
        --reg-host )
            shift
            REGISTRY_HOST=$1
        ;; 
        --reg-cred-b64 )
            shift
            REG_CREDS_B64=$1
        ;; 
        * )              echo "Invalid parameter detected => $1"
            exit 1
    esac
    shift
done

if [ -z $PLATFORM_USER ]; then
    echo "Missing param --platform-user"
    exit 1
fi
if [ -z $REGISTRY_HOST ]; then
    echo "Missing param --reg-host"
    exit 1
fi
if [ -z $REG_CREDS_B64 ]; then
    echo "Missing param --reg-cred-b64"
    exit 1
fi

if (k3s kubectl get pod mdos-registry-v2-0 -n mdos-registry) &> /dev/null; then
    echo "Registry v2 already deployed, skipping"
    exit 0
else
  IFS=':' read -r -a REG_SPLIT <<< "$REGISTRY_HOST"
  REGISTRY_HOST_STRIPPED="${REG_SPLIT[0]}"
  REGISTRY_HOST_PORT="${REG_SPLIT[1]}"

  # Extract the credentials from the base64 string
  B64_DECODED=$(echo $REG_CREDS_B64 | base64 --decode)
  IFS=':' read -r -a CREDS <<< "$B64_DECODED"
  REG_USER="${CREDS[0]}"
  REG_PASS="${CREDS[1]}"

  # Create kubernetes namespace & secrets for registry
  k3s kubectl create ns mdos-registry
  k3s kubectl create secret tls certs-secret --cert=/home/$PLATFORM_USER/registry/certs/$REGISTRY_HOST_STRIPPED.crt --key=/home/$PLATFORM_USER/registry/certs/$REGISTRY_HOST_STRIPPED.key -n mdos-registry
  k3s kubectl create secret generic auth-secret --from-file=/home/$PLATFORM_USER/registry/auth/htpasswd -n mdos-registry

  # Deploy registry on k3s
  cat <<EOF | k3s kubectl apply -n mdos-registry -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mdos-registry-v2-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
  - ReadWriteOnce
  hostPath:
    path: /home/$PLATFORM_USER/registry/data
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mdos-registry-v2
  labels:
    app: mdos-registry-v2
spec:
  selector:
    matchLabels:
      app: mdos-registry-v2
  serviceName: mdos-registry-v2
  updateStrategy:
    type: RollingUpdate
  replicas: 1
  template:
    metadata:
      labels:
        app: mdos-registry-v2
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: mdos-registry-v2
        image: registry:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 5000
          protocol: TCP
        volumeMounts:
        - name: repo-vol
          mountPath: /var/lib/registry
        - name: certs-vol
          mountPath: "/certs"
          readOnly: true
        - name: auth-vol
          mountPath: "/auth"
          readOnly: true
        env:
        - name: REGISTRY_HTTP_ADDR
          value: "0.0.0.0:5000"
        - name: REGISTRY_AUTH
          value: "htpasswd"
        - name: REGISTRY_AUTH_HTPASSWD_REALM
          value: "Registry Realm"
        - name: REGISTRY_AUTH_HTPASSWD_PATH
          value: "/auth/htpasswd"
        - name: REGISTRY_HTTP_TLS_CERTIFICATE
          value: "/certs/tls.crt"
        - name: REGISTRY_HTTP_TLS_KEY
          value: "/certs/tls.key"
      volumes:
      - name: certs-vol
        secret:
          secretName: certs-secret
      - name: auth-vol
        secret:
          secretName: auth-secret
  volumeClaimTemplates:
  - metadata:
      name: repo-vol
    spec:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mdos-registry-v2
spec:
  selector:
    app: mdos-registry-v2
  ports:
    - port: 5000
      targetPort: 5000
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: mdos-registry-v2
spec:
  hosts:
    - $REGISTRY_HOST_STRIPPED
  gateways:
    - istio-system/https-gateway
  tls:
  - match:
    - port: 443
      sniHosts:
      - $REGISTRY_HOST_STRIPPED
    route:
    - destination:
        host: mdos-registry-v2.mdos-registry.svc.cluster.local
        port:
          number: 5000
EOF
fi

# Wait untill registry is up and running
until (k3s kubectl get pod mdos-registry-v2-0 -n mdos-registry | grep "Running") &> /dev/null
do
   echo "Waiting for the registry to come online ..."
   sleep 4
done

(docker login --username "$REG_USER" --password $REG_PASS $REGISTRY_HOST) &> /dev/null