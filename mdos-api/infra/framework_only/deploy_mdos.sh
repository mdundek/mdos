#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

# default secret for SA
cat <<EOF | kubectl create -f -
apiVersion: v1
kind: Secret
metadata:
  name: default
  namespace: mdos
  annotations:
    kubernetes.io/service-account.name: "default"
type: kubernetes.io/service-account-token
EOF

# Admin role
cat <<EOF | kubectl create -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: mdos-admin-role
rules:
- apiGroups:
  - '*'
  resources:
  - '*'
  verbs:
  - '*'
- nonResourceURLs:
  - '*'
  verbs:
  - '*'
EOF

# Admin role binding
cat <<EOF | kubectl create -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: scds-admin-role-binding
roleRef:
  kind: ClusterRole
  name: mdos-admin-role
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: ServiceAccount
  name: default
  namespace: mdos
EOF

# Ingress class
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: istio
spec:
  controller: istio.io/ingress-controller
EOF

# Now deploy mdos controller
kubectl apply -f mdos-framework.yaml -n mdos