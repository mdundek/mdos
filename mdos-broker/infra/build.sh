#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

while [ "$1" != "" ]; do
    case $1 in
        --export|-e )
            DO_EXPORT=1
        ;; 
        --domain )
            shift
            DOMAIN=$1
        ;; 
        * ) echo "Invalid parameter detected => $1"
            exit 1
    esac
    shift
done

if [ -z $DOMAIN ]; then
    echo "Missing parameter: --domain <your domain>"
    exit 1
fi

cd ..

echo "li14ebe14" | docker login registry.$DOMAIN --username mdundek --password-stdin

CURRENT_APP_VERSION=$(cat ./package.json | grep '"version":' | cut -d ":" -f2 | cut -d'"' -f 2)

docker build -t registry.$DOMAIN/mdos-broker:$CURRENT_APP_VERSION .
docker push registry.$DOMAIN/mdos-broker:$CURRENT_APP_VERSION

if [ ! -z $DO_EXPORT ]; then
    docker tag registry.$DOMAIN/mdos-broker:$CURRENT_APP_VERSION mdos-broker:$CURRENT_APP_VERSION
    docker save mdos-broker:$CURRENT_APP_VERSION | gzip > ../mdos-setup/dep/mdos-broker/mdos-broker.tar.gz
fi