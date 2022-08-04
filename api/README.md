# api

> Mdos API server

## Kube API credentials

cat <<EOF | kubectl create -f -
apiVersion: v1
kind: Secret
metadata:
  name: build-robot-secret
  namespace: mdos
  annotations:
    kubernetes.io/service-account.name: default
type: kubernetes.io/service-account-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: mdos-admin-role-bindings
roleRef:
  kind: ClusterRole
  name: admin
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: ServiceAccount
  name: default
  namespace: mdos
EOF

kubectl get secrets -n mdos -o jsonpath="{.items[?(@.metadata.annotations['kubernetes\.io/service-account\.name']=='default')].data.token}"|base64 --decode




sudo helm upgrade --install -n keycloak --values ./values.yaml mdos-keycloak /home/mdundek/workspaces/mdos/setup/dep/generic-helm-chart --atomic



