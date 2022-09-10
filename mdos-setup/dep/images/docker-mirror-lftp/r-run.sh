#!/bin/bash

docker run --name mdos-mirror-lftp --rm -it \
    -e PROTOCOL=ftp \
    -e HOST=192.168.50.119 \
    -e PORT=3915 \
    -e USERNAME=foo \
    -e PASSWORD=bar \
    -e LOCAL_DIR=/usr/src/volume \
    -e REMOTE_DIR=./ \
    -e PARALLEL=2 \
    -v /Users/mdundek/workspaces/perso/mdos_playground/mdos-doc/volumes/docs:/usr/src/volume \
    registry.mdundek.network/mdos-mirror-lftp:latest \
    sh /usr/local/bin/mirror.sh