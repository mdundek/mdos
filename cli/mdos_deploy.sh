#!/bin/bash

CDIR=$1

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source .env

cd ../files/generic-helm-chart
GEN_HELP_CHART_PATH=$(pwd)
cd $_DIR

source ./lib/components.sh
source ./lib/helpers.sh

generateValuesYaml() {
    STATIC_COMP_APPEND='{"skipNetworkIsolation": true,"imagePullSecrets": [{"name": "regcred"}],"isDaemonSet": false,"serviceAccount": {"create": false},"podAnnotations": {},"podSecurityContext": {},"securityContext": {},"waitForComponents": [],"logs": {"enabled": false},"autoscaling": {"enabled": false}}'
    STATIC_APP_APPEND='{"enabled": true,"developement": false,"appInternalName": "'$1'","nodeSelector":{},"tolerations":[],"affinity":{},"isMdosApp": true, "global": {"imagePullPolicy":"Always","config": [],"secrets": []}}'

    # Make copy of application values file to work with
    cp ./values.yaml ./values_merged.yaml

    # Declare App comp array
    APP_COMPONENTS=()

    # Load all application components from the file
    readarray appcomponents < <(yq e -o=j -I=0 '.appComponents[]' values_merged.yaml )

    C_INDEX=0
    # Iterate over components
    for appComponent in "${appcomponents[@]}"; do
        COMP_NAME=$(echo "$appComponent" | jq -r '.name')
        
        # Appens what we need to this component
        COMP_UPD=$(yq ".appComponents[$C_INDEX] + $STATIC_COMP_APPEND" values_merged.yaml)

        # Store the updated component in our array
        APP_COMPONENTS+=("$COMP_UPD")

        # Increment index
        C_INDEX=$((C_INDEX+1))
    done

    C_INDEX=0
    # Iterate over components
    for appComponent in "${appcomponents[@]}"; do
        echo "$(yq 'del(.appComponents[0])' values_merged.yaml)" > ./values_merged.yaml

        # Increment index
        C_INDEX=$((C_INDEX+1))
    done

    # Put it all back together
    for appComponent in "${APP_COMPONENTS[@]}"; do
        APP_COMP_JSON=$(echo "$appComponent" | yq -o=json -I=0 '.')

        VALUES_UPD=$(yq ".appComponents += $APP_COMP_JSON" values_merged.yaml)
        echo "$VALUES_UPD" > values_merged.yaml
    done

    VALUES_UPD=$(yq ". += $STATIC_APP_APPEND" values_merged.yaml)
    echo "$VALUES_UPD" > values_merged.yaml
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
        rm -rf $CDIR/values_merged.yaml
        echo ""
    }

    trap _catch ERR
    trap _finally EXIT
  
    # ############### EXECUTE ################
    cd $CDIR

    if [ -f ../values.yaml ]; then
        cd ..
        CDIR=$(pwd)
    fi

    if [ ! -f ./values.yaml ]; then
        error "You do not seem to be in a MDOS project"
        exit 1
    fi

    I_APP=$(yq eval '.appName' ./values.yaml)
    I_NS=$(yq eval '.mdosBundleName' ./values.yaml)
   
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
        REG_CREDS=$(echo "$REG_CREDS_B64" | base64 --decode)
        
        kubectl create secret docker-registry \
            regcred \
            --docker-server=$REGISTRY_HOST \
            --docker-username=$(echo "$REG_CREDS" | cut -d':' -f1) \
            --docker-password=$(echo "$REG_CREDS" | cut -d':' -f2) \
            -n $I_NS 1>/dev/null
    fi

    generateValuesYaml $I_APP

    helm upgrade --install $I_APP $GEN_HELP_CHART_PATH \
        --values ./values_merged.yaml \
        -n $I_NS --atomic 1> /dev/null

    echo ""
    info "Application deployed successfully"
)