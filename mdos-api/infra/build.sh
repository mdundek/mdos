#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

cd ..

echo "li14ebe14" | docker login registry.mdundek.network --username mdundek --password-stdin

cp infra/dep/helm/helm .

docker build -t registry.mdundek.network/mdos-api:latest .

rm -rf helm

docker push registry.mdundek.network/mdos-api:latest