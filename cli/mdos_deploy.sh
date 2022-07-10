#!/bin/bash

CDIR=$1

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

cd ../files/generic-helm-chart
GEN_HELP_CHART_PATH=$(pwd)
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

    if [ ! -f ./values.yaml ]; then
        error "You do not seem to be in a MDOS project"
        exit 1
    fi

    I_APP=$(yq eval '.appName' ./values.yaml)
    I_NS=$(yq eval '.scdsBundleName' ./values.yaml)
    I_REG=$(yq eval '.registry' ./values.yaml)
   
    while read NS_LINE ; do 
        NS_NAME=`echo "$NS_LINE" | cut -d' ' -f 1`
        if [ "$NS_NAME" == "$I_NS" ]; then
            NS_EXISTS=1
        fi
    done < <(kubectl get ns 2>/dev/null)

    if [ -z $NS_EXISTS ]; then
        kubectl create ns $I_NS
    fi

    while read SECRET_LINE ; do 
        NS_NAME=`echo "$SECRET_LINE" | cut -d' ' -f 1`
        if [ "$NS_NAME" == "regcred" ]; then
            SECRET_EXISTS=1
        fi
    done < <(kubectl get secret -n $I_NS 2>/dev/null)

    if [ -z $SECRET_EXISTS ]; then
        kubectl create secret docker-registry \
            regcred \
            --docker-server=$I_REG \
            --docker-username=mdundek \
            --docker-password=J8cqu3s! \
            -n $I_NS 1>/dev/null
    fi

    helm upgrade --install $I_APP $GEN_HELP_CHART_PATH \
        --values ./values.yaml \
        --kubeconfig /etc/rancher/k3s/k3s.yaml \
        -n $I_NS 1> /dev/null

    echo ""
    info "Application deployed successfully"
)