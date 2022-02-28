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
        --reg-creds-b64 )
            shift
            REG_CREDS_B64=$1
        ;; 
        * )              echo "Invalid parameter detected"
            exit 1
    esac
    shift
done

if [ -z $REGISTRY_HOST ]; then
    echo "Missing param --reg-host"
    exit 1
fi
if [ -z $REG_CREDS_B64 ]; then
    echo "Missing param --reg-creds-b64"
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
  
  # Extract the credentials from the base64 string
  B64_DECODED=$(echo $REG_CREDS_B64 | base64 --decode)
  IFS=':' read -r -a CREDS <<< "$B64_DECODED"

  # Push the docker image to the Artifactory
  docker login --username "${CREDS[0]}" --password ${CREDS[1]} $REGISTRY_HOST
  docker push $IMG_TAG
)