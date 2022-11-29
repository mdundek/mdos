#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

kubectl delete -f mdos-framework.yaml -n mdos

cd ../..

cp infra/dep/helm/helm .
cp infra/dep/kubectl/kubectl .
cp -R ../mdos-setup/dep/mhc-generic/chart ./mhc-generic

docker build -t mdundek/mdos-api:latest .

rm -rf helm
rm -rf kubectl
rm -rf mhc-generic

docker push mdundek/mdos-api:latest
if [ $? != 0 ]; then
    echo "Could not push image to registry"
    exit 1
fi

cd $_DIR
kubectl apply -f mdos-framework.yaml -n mdos
sleep 15

POD_NAME=$(kubectl get pods -n mdos | grep "mdos-api" | grep "Running" | cut -d' ' -f 1)
# echo "kubectl logs $POD_NAME -n mdos"
kubectl logs $POD_NAME -n mdos --follow
