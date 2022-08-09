# api

> Mdos API server

## Kube API credentials

kubectl create ns mdos-solution

kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: default-token
  namespace: mdos-solution
  annotations:
    kubernetes.io/service-account.name: default
type: kubernetes.io/service-account-token
EOF

while ! kubectl describe secret default-token -n mdos-solution | grep -E '^token' >/dev/null; do
  echo "waiting for token..." >&2
  sleep 1
done

kubectl apply -f - <<EOF
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
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: mdos-admin-role-bindings
roleRef:
  kind: ClusterRole
  name: mdos-admin-role
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: ServiceAccount
  name: default
  namespace: mdos-solution
EOF

TOKEN=$(kubectl get secret default-token -n mdos-solution -o jsonpath='{.data.token}' | base64 --decode)

echo "$TOKEN"








sudo helm upgrade --install -n keycloak --values ./values.yaml mdos-keycloak /home/mdundek/workspaces/mdos/setup/dep/generic-helm-chart --atomic



