#!/bin/bash

CDIR=$1

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ./lib/components.sh
source ./lib/helpers.sh


# ################################################
# ############ TRY CATCH INTERCEPTORS ############
# ################################################
(
    set -Ee

    function _catch {
        # Rollback
        error "An error occured"
        
    }

    function _finally {
        # Cleanup
        echo ""
    }

    trap _catch ERR
    trap _finally EXIT
  
    # ############### EXECUTE ################
    cd $CDIR

    if [ ! -f ./Dockerfile ]; then
        error "You do not seem to be in a application component directory"
        exit 1
    fi

    if [ ! -f ../values.yaml ]; then
        error "You do not seem to be in a MDOS project"
        exit 1
    fi

    COMP_NAME=$(basename "$(pwd)")

    I_REG=$(yq eval '.registry' ../values.yaml)
    I_REPO=$(yq eval '.appComponents[] | select(.name == "'"$COMP_NAME"'") | .image.repository' ../values.yaml)
    I_TAG=$(yq eval '.appComponents[] | select(.name == "'"$COMP_NAME"'") | .image.tag' ../values.yaml)

    docker build -t $I_REG/$I_REPO:$I_TAG .
    docker push $I_REG/$I_REPO:$I_TAG

    echo ""
    info "Application build successfully"
)