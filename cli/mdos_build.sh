#!/bin/bash

CDIR=$1

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source .env

source ./lib/components.sh
source ./lib/helpers.sh

shift
while [ "$1" != "" ]; do
    case $1 in
        --all|-a )
            shift
            BUILD_ALL=1
        ;; 
        * ) echo "Invalid parameter detected => $1"
            exit 1
    esac
    shift
done

# ------------------------------------------------
build_component() {
    if [ -f ./pre_build.sh ]; then
        chmod a+x ./pre_build.sh
        ./pre_build.sh
    fi

    COMP_NAME=$(basename "$(pwd)")

    I_REPO=$(yq eval '.appComponents[] | select(.name == "'"$COMP_NAME"'") | .image.repository' ../values.yaml)
    I_TAG=$(yq eval '.appComponents[] | select(.name == "'"$COMP_NAME"'") | .image.tag' ../values.yaml)

    docker build -t $REGISTRY_HOST/$I_REPO:$I_TAG .
    docker push $REGISTRY_HOST/$I_REPO:$I_TAG
}

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

    # Authenticate to registry
    if [ -z "$(cat $HOME/.docker/config.json | grep "$REGISTRY_HOST")" ]; then
        # Extract the credentials from the base64 string
        B64_DECODED=$(echo $REG_CREDS_B64 | base64 --decode)
        IFS=':' read -r -a CREDS <<< "$B64_DECODED"
        REG_USER="${CREDS[0]}"
        REG_PASS="${CREDS[1]}"

        docker login --username "$REG_USER" --password $REG_PASS $REGISTRY_HOST
    fi

    cd $CDIR

    ## Build current component only
    if [ -z $BUILD_ALL ]; then
        if [ ! -f ./Dockerfile ]; then
            error "You do not seem to be in a application component directory"
            exit 1
        fi

        if [ ! -f ../values.yaml ]; then
            error "You do not seem to be in a MDOS project"
            exit 1
        fi

        build_component
    else # Build all components of application
        if [ -f ../values.yaml ]; then
            cd ..
        fi

        if [ ! -f ./values.yaml ]; then
            error "You do not seem to be in a MDOS project"
            exit 1
        fi

        BASE_D=$(pwd)

        for component in */ ; do
            if [ -f $BASE_D/$component/Dockerfile ]; then
                cd $BASE_D/$component
                build_component
            fi
        done
    fi

    echo ""
    info "Application(s) build successfully"
)