#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ../lib/components.sh
source ../lib/helpers.sh

while [ "$1" != "" ]; do
    case $1 in
        --home-dir )
            shift
            HOME_DIR=$1
        ;;
        --extended-cf )
            EXTENDED_CF=1
        ;;
        --extended-cs )
            EXTENDED_CS=1
        ;;
        --extended-registry )
            EXTENDED_REG=1
        ;;
        --extended-nginx )
            EXTENDED_NGINX=1
        ;;
        --extended-openresty )
            EXTENDED_OPENRESTY=1
        ;;
        --extended-minio )
            EXTENDED_MINIO=1
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

if [ ! -f ../../cli/.env ]; then
    error ".env file not found. Did you run the script: 01_setup_mdos_cmd.sh ?"
    exit 1
fi

#if [ -f $C_HOME_DIR/.docker/config.json ]; then
#    DOCKER_AUTH_LOCAL_OK=$(cat $C_HOME_DIR/.docker/config.json | jq '.[]["registry.mdundek.private:30979"].auth')
#    if [ "$DOCKER_AUTH_LOCAL_OK" == "null" ]; then
#        docker login registry.mdundek.private:30979 -u mdundek -p J8cqu3s! > /dev/null 2>&1
#    fi
#else
#    docker login registry.mdundek.private:30979 -u mdundek -p J8cqu3s! > /dev/null 2>&1
#fi

if [ "$(cat ../../cli/.env | grep "DOMAIN=")" == "" ]; then
    user_input DOMAIN "Enter your root domain name:"
    echo "DOMAIN=$DOMAIN" >> ../../cli/.env
    echo "REGISTRY_HOST=registry.$DOMAIN:30979" >> ../../cli/.env
fi

if [ "$(cat ../../cli/.env | grep "PLATFORM_USER=")" == "" ]; then
    echo "PLATFORM_USER=$USER" >> ../../cli/.env
fi

if [ ! -z $EXTENDED_REG ]; then
    if [ "$(cat ../../cli/.env | grep "REG_CREDS_B64=")" == "" ]; then
        user_input REG_USER "Enter a registry username:"
        user_input REG_PASS "Enter a registry password:"
        echo "REG_CREDS_B64=$(echo -n "$REG_USER:$REG_PASS" | base64 -w 0)" >> ../../cli/.env
    fi
fi

if [ ! -z $EXTENDED_CF ]; then
    if [ "$(cat ../../cli/.env | grep "CF_EMAIL=")" == "" ]; then
        user_input CF_EMAIL "Enter your Cloudflare account email:"
        echo "CF_EMAIL=$CF_EMAIL" >> ../../cli/.env
    fi

    if [ "$(cat ../../cli/.env | grep "CF_TOKEN=")" == "" ]; then
        user_input CF_TOKEN "Enter your Cloudflare API token:"
        echo "CF_TOKEN=$CF_TOKEN" >> ../../cli/.env
    fi
fi

if [ ! -z $EXTENDED_CS ]; then
    if [ "$(cat ../../cli/.env | grep "CS_PASSWORD=")" == "" ]; then
        user_input CS_PASSWORD "Enter a code server password:"
        echo "CS_PASSWORD=$CS_PASSWORD" >> ../../cli/.env
    fi
fi

if [ ! -z $EXTENDED_NGINX ]; then
    if [ "$(cat ../../cli/.env | grep "NGINX_ADMIN_USER=")" == "" ]; then
        user_input NGINX_ADMIN_USER "Enter a Nginx admin username:"
        echo "NGINX_ADMIN_USER=$NGINX_ADMIN_USER" >> ../../cli/.env
    fi

    if [ "$(cat ../../cli/.env | grep "NGINX_ADMIN_PASSWORD=")" == "" ]; then
        user_input NGINX_ADMIN_PASSWORD "Enter a Nginx admin password:"
        echo "NGINX_ADMIN_PASSWORD=$NGINX_ADMIN_PASSWORD" >> ../../cli/.env
    fi
fi

if [ ! -z $EXTENDED_MINIO ]; then
    if [ "$(cat ../../cli/.env | grep "MINIO_STORAGE_DIR=")" == "" ]; then
        user_input MINIO_STORAGE_DIR "Where do you want to store your Minio files:"
        echo "MINIO_STORAGE_DIR=$MINIO_STORAGE_DIR" >> ../../cli/.env
    fi

    if [ "$(cat ../../cli/.env | grep "MINIO_ACCESS_KEY=")" == "" ]; then
        user_input MINIO_ACCESS_KEY "Specify your ACCESS_KEY:" "REp9k63uJ6qTe4KRtMsU"
        echo "MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY" >> ../../cli/.env
    fi

    if [ "$(cat ../../cli/.env | grep "MINIO_SECRET_KEY=")" == "" ]; then
        user_input MINIO_SECRET_KEY "Specify your SECRET_KEY:" "ePFRhVookGe1SX8u9boPHoNeMh2fAO5OmTjckzFN"
        echo "MINIO_SECRET_KEY=$MINIO_SECRET_KEY" >> ../../cli/.env
    fi
fi

if [ ! -z $EXTENDED_OPENRESTY ]; then
    if [ "$(cat ../../cli/.env | grep "LOCAL_IP=")" == "" ]; then
        user_input LOCAL_IP "Enter the Code Server static LAN IP address:"
        echo "LOCAL_IP=$LOCAL_IP" >> ../../cli/.env
    fi
fi