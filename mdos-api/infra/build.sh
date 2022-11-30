#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

while [ "$1" != "" ]; do
    case $1 in
        --deploy|-d )
            DO_DEPLOY=1
        ;;
        --restart|-r )
            DO_RESTART=1
        ;;
        --export|-e )
            DO_EXPORT=1
        ;; 
        --domain )
            shift
            DOMAIN=$1
        ;; 
        * ) echo "Invalid parameter detected => $1"
            exit 1
    esac
    shift
done

if [ -z $DOMAIN ]; then
    echo "Missing parameter: --domain <your domain>"
    exit 1
fi

# ############### MDOS APP DEPLOY ################
mdos_deploy_app() {
    I_APP=$(cat ./target_values.yaml | yq eval '.appName')
    I_NS=$(cat ./target_values.yaml | yq eval '.tenantName')
    unset NS_EXISTS
    while read NS_LINE ; do 
        NS_NAME=`echo "$NS_LINE" | cut -d' ' -f 1`
        if [ "$NS_NAME" == "$I_NS" ]; then
            NS_EXISTS=1
        fi
    done < <(kubectl get ns 2>/dev/null)

    if [ -z $NS_EXISTS ]; then
        kubectl create ns $I_NS
        if [ ! -z $1 ]; then
            kubectl label ns $I_NS istio-injection=enabled
        fi
    fi

    unset SECRET_EXISTS
    while read SECRET_LINE ; do 
        NS_NAME=`echo "$SECRET_LINE" | cut -d' ' -f 1`
        if [ "$NS_NAME" == "regcred" ]; then
            SECRET_EXISTS=1
        fi
    done < <(kubectl get secret -n $I_NS 2>/dev/null)

    if [ -z $SECRET_EXISTS ]; then
        kubectl create secret docker-registry \
            regcred \
            --docker-server=registry.$DOMAIN \
            --docker-username=mdundek \
            --docker-password=li14ebe14 \
            -n $I_NS
    fi

    helm upgrade --install $I_APP ../../mdos-setup/dep/mhc-generic/chart \
        --values ./target_values.yaml \
        -n $I_NS --atomic
}

cd ..

echo "li14ebe14" | docker login registry.$DOMAIN --username mdundek --password-stdin

cp infra/dep/helm/helm .
cp infra/dep/kubectl/kubectl .
cp -R ../mdos-setup/dep/mhc-generic/chart ./mhc-generic

docker build -t registry.$DOMAIN/mdos-api:latest .

rm -rf helm
rm -rf kubectl
rm -rf mhc-generic

docker push registry.$DOMAIN/mdos-api:latest

if [ ! -z $DO_EXPORT ]; then
    docker tag registry.$DOMAIN/mdos-api:latest mdos-api:latest
    docker save mdos-api:latest | gzip > ../mdos-setup/dep/mdos-api/mdos-api.tar.gz
fi

cd ../mdos-broker
docker build -t registry.$DOMAIN/mdos-broker:latest .
docker push registry.$DOMAIN/mdos-broker:latest

if [ ! -z $DO_EXPORT ]; then
    docker tag registry.$DOMAIN/mdos-broker:latest mdos-broker:latest
    docker save mdos-broker:latest | gzip > ../mdos-setup/dep/mdos-broker/mdos-broker.tar.gz
fi

cd ../mdos-api/infra

if [ ! -z $DO_DEPLOY ]; then
    OIDC_DISCOVERY=$(curl "https://keycloak.$DOMAIN:30999/realms/mdos/.well-known/openid-configuration")
    OIDC_ISSUER_URL=$(echo $OIDC_DISCOVERY | jq -r .issuer)
    OIDC_JWKS_URI=$(echo $OIDC_DISCOVERY | jq -r .jwks_uri) 

    helm uninstall mdos -n mdos --wait

    # Deploy keycloak
    cat ./values.yaml > ./target_values.yaml

    sed -i "s|<DOMAIN>|$DOMAIN|g" ./target_values.yaml

    mdos_deploy_app
    rm -rf ./target_values.yaml

    POD_NAME=$(kubectl get pods -n mdos | grep "mdos-api" | grep "Running" | cut -d' ' -f 1)
    BROKER_POD_NAME=$(kubectl get pods -n mdos | grep "mdos-broker" | grep "Running" | cut -d' ' -f 1)
    kubectl logs $BROKER_POD_NAME -n mdos --follow
fi

if [ ! -z $DO_RESTART ]; then
    POD_NAME=$(kubectl get pods -n mdos | grep "mdos-api" | grep "Running" | cut -d' ' -f 1)
    kubectl delete pod $POD_NAME -n mdos
    sleep 1
    POD_NAME=$(kubectl get pods -n mdos | grep "mdos-api" | grep "Running" | cut -d' ' -f 1)

    kubectl logs $POD_NAME -n mdos --follow
fi

# exec_in_pod() {
#     POD_CANDIDATES=()
#     NS_CANDIDATES=()
#     while read DEPLOYMENT_LINE ; do 
#         POD_NAME=`echo "$DEPLOYMENT_LINE" | awk 'END {print $2}'`
#         NS_NAME=`echo "$DEPLOYMENT_LINE" | awk 'END {print $1}'`
#         if [[ "$POD_NAME" == *"$1"* ]]; then
#             POD_CANDIDATES+=($POD_NAME)
#             NS_CANDIDATES+=($NS_NAME)
#         fi
#     done < <(kubectl get pod -A 2>/dev/null)

#     if [ ${#POD_CANDIDATES[@]} -eq 0 ]; then
#         error "Could not find any candidates for this pod name"
#         exit 1
#     else
#         k3s kubectl exec --stdin --tty ${POD_CANDIDATES[0]} -n ${NS_CANDIDATES[0]} -- $2
#     fi
# }