#!/bin/bash

docker build -t mdundek/mdos-mirror-lftp:latest .
docker push mdundek/mdos-mirror-lftp:latest
