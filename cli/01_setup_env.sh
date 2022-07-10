#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ./lib/components.sh
source ./lib/helpers.sh

while [ "$1" != "" ]; do
    case $1 in
        --home-dir )
            shift
            HOME_DIR=$1
        ;;
        * ) error "Invalid parameter detected: $1"
            exit 1
    esac
    shift
done

if [ -z $HOME_DIR ]; then
    C_HOME_DIR=$HOME
else
    C_HOME_DIR=$HOME_DIR
fi

if [ ! -f .env ]; then
    error ".env file not found. Did you run the script: 00_setup_mdos_cmd.sh ?"
    exit 1
fi

if [ -f $C_HOME_DIR/.docker/config.json ]; then
    DOCKER_AUTH_LOCAL_OK=$(cat $C_HOME_DIR/.docker/config.json | jq '.[]["registry.mdundek.network:30979"].auth')
    if [ "$DOCKER_AUTH_LOCAL_OK" == "null" ]; then
        docker login registry.mdundek.network:30979 -u mdundek -p J8cqu3s! > /dev/null 2>&1
    fi
else
    docker login registry.mdundek.network:30979 -u mdundek -p J8cqu3s! > /dev/null 2>&1
fi

if [ "$(cat .env | grep "REGISTRY_BASE=")" == "" ]; then
    informUpdateNeeded
    user_input REGISTRY_BASE "Enter the registry host & port:"
    echo "REGISTRY_BASE=$REGISTRY_BASE" >> .env
fi
