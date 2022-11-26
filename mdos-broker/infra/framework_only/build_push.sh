#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

cd ../..

docker build -t mdundek/mdos-broker:latest .

docker push mdundek/mdos-broker:latest