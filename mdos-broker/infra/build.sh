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

echo "li14ebe13" | docker login registry.$DOMAIN --username mdundek --password-stdin

docker build -t registry.$DOMAIN/mdos-broker:latest .
docker push registry.$DOMAIN/mdos-broker:latest

if [ ! -z $DO_EXPORT ]; then
    docker tag registry.$DOMAIN/mdos-broker:latest mdos-broker:latest
    docker save mdos-broker:latest | gzip > ../mdos-setup/dep/mdos-broker/mdos-broker.tar.gz
fi