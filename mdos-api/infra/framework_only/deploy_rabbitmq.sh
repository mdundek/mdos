#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
chmod a+x /usr/local/bin/yq

helm repo add bitnami https://charts.bitnami.com/bitnami
helm install rabbit-operator bitnami/rabbitmq-cluster-operator --namespace rabbitmq --create-namespace --kubeconfig /etc/rancher/k3s/k3s.yaml --atomic

# Wait untill available
sleep 20

# Instantiate cluster
cat <<EOF | kubectl apply -f -
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq-cluster
  namespace: rabbitmq
spec:
  replicas: 1
  override:
    statefulSet:
      spec:
        podManagementPolicy: OrderedReady
  service:
    type: NodePort
  persistence:
    storageClassName: local-path
    storage: 1Gi
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values:
              - rabbitmq-cluster
        topologyKey: kubernetes.io/hostname
  rabbitmq:
    additionalPlugins:
    - rabbitmq_federation
    additionalConfig: |
      disk_free_limit.absolute = 500MB
      vm_memory_high_watermark.relative = 0.6
EOF

# Wait for pod rabbitmq-cluster-server-0
sleep 10

# Copy credentials secret over to mdos namespacev

SECRET_YAML=$(kubectl get secret rabbitmq-cluster-default-user --namespace rabbitmq --output yaml \
    | sed "s/namespace: rabbitmq/namespace: mdos/")
cat <<EOF | kubectl apply -n mdos -f -
$SECRET_YAML
EOF

kubectl create namespace mdos

SECRET_YAML=$(kubectl get secret rabbitmq-cluster-default-user -n rabbitmq -o yaml | grep -v '^\s*namespace:\s' | grep -v '^\s*creationTimestamp:\s' | grep -v '^\s*resourceVersion:\s' | grep -v '^\s*uid:\s')
SECRET_YAML=$(echo "$SECRET_YAML" | yq eval 'del(.metadata.ownerReferences)')
SECRET_YAML=$(echo "$SECRET_YAML" | yq eval 'del(.metadata.labels)')
cat <<EOF | kubectl apply -n mdos -f -
$SECRET_YAML
EOF