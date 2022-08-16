#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR
APP_DIR=$(pwd)

# Parse parameters
while [ "$1" != "" ]; do
    case $1 in
        --reg-host )
            shift
            REGISTRY_HOST=$1
        ;; 
        --docker-repo )
            shift
            INIT_CONTAINER_REPO=$1
        ;; 
        --reg-user )
            shift
            REG_USER=$1
        ;; 
        --reg-pass )
            shift
            REG_PASS=$1
        ;; 
        * ) echo "Invalid parameter detected"
            exit 1
    esac
    shift
done

if [ -z $REGISTRY_HOST ]; then
    echo "Missing param --reg-host"
    exit 1
fi
if [ -z $REG_USER ]; then
    echo "Missing param --reg-user"
    exit 1
fi
if [ -z $REG_PASS ]; then
    echo "Missing param --reg-pass"
    exit 1
fi
if [ -z $INIT_CONTAINER_REPO ]; then
    echo "Missing param --docker-repo"
    exit 1
fi

IMG_TAG=$REGISTRY_HOST/$INIT_CONTAINER_REPO

(
  set -Ee

  # ################################################
  # ############ TRY CATCH INTERCEPTORS ############
  # ################################################

  function _catch {
    # Rollback
    echo "An error occured"
    
  }

  function _finally {
    # Cleanup
    docker image rm -f $IMG_TAG >/dev/null 2>&1 || true
  }

  trap _catch ERR
  trap _finally EXIT
  
  # ################################################
  # ############### TRY CATCH BLOCK ################
  # ################################################

  # Build the docker image
  cd $APP_DIR
  DOCKER_BUILDKIT=1 docker build -t $IMG_TAG .

  # Push the docker image to the Artifactory
  docker login --username "$REG_USER" --password $REG_PASS $REGISTRY_HOST
  docker push $IMG_TAG
)