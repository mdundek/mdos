#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

while [ "$1" != "" ]; do
    case $1 in
        * ) echo "Invalid parameter detected => $1"
            exit 1
    esac
    shift
done

DOMAIN=mydomain.com

cd ..

echo "li14ebe13" | docker login registry.$DOMAIN --username mdundek --password-stdin
docker build -t registry.$DOMAIN/mdos-ftp-bot:latest .
docker push registry.$DOMAIN/mdos-ftp-bot:latest