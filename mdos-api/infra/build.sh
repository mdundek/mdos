#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

while [ "$1" != "" ]; do
    case $1 in
        --deploy|-d )
            DO_DEPLOY=1
        ;; 
        --export|-e )
            DO_EXPORT=1
        ;; 
        * ) echo "Invalid parameter detected => $1"
            exit 1
    esac
    shift
done

DOMAIN=mdundek.network

# ############### MDOS APP DEPLOY ################
mdos_deploy_app() {
    I_APP=$(cat ./target_values.yaml | yq eval '.appName')
    I_NS=$(cat ./target_values.yaml | yq eval '.mdosBundleName')
    unset NS_EXISTS
    while read NS_LINE ; do 
        NS_NAME=`echo "$NS_LINE" | cut -d' ' -f 1`
        if [ "$NS_NAME" == "$I_NS" ]; then
            NS_EXISTS=1
        fi
    done < <(kubectl get ns 2>/dev/null)

    if [ -z $NS_EXISTS ]; then
        kubectl create ns $I_NS &>> $LOG_FILE
        if [ ! -z $1 ]; then
            kubectl label ns $I_NS istio-injection=enabled &>> $LOG_FILE
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
        REG_CREDS=$(echo "$REG_CREDS_B64" | base64 --decode)
        
        kubectl create secret docker-registry \
            regcred \
            --docker-server=registry.$DOMAIN \
            --docker-username=$(echo "$REG_CREDS" | cut -d':' -f1) \
            --docker-password=$(echo "$REG_CREDS" | cut -d':' -f2) \
            -n $I_NS 1>/dev/null
    fi

    STATIC_COMP_APPEND='{"skipNetworkIsolation": true,"imagePullSecrets": [{"name": "regcred"}],"isDaemonSet": false,"serviceAccount": {"create": false},"podAnnotations": {},"podSecurityContext": {},"securityContext": {},"waitForComponents": [],"logs": {"enabled": false},"autoscaling": {"enabled": false}}'
    STATIC_APP_APPEND='{"registry": "registry.'$DOMAIN'","enabled": true,"developement": false,"appInternalName": "'$I_APP'","nodeSelector":{},"tolerations":[],"affinity":{},"isMdosApp": true, "global": {"imagePullPolicy":"Always","config": [],"secrets": []}}'

    # Make copy of application values file to work with
    cp ./target_values.yaml ./values_merged.yaml

    # Declare App comp array
    APP_COMPONENTS=()

    # Load all application components from the file
    readarray appcomponents < <(cat values_merged.yaml | yq e -o=j -I=0 '.appComponents[]' )

    C_INDEX=0
    # Iterate over components
    for appComponent in "${appcomponents[@]}"; do
        COMP_NAME=$(echo "$appComponent" | jq -r '.name')
        
        # Appens what we need to this component
        COMP_UPD=$(cat values_merged.yaml | yq ".appComponents[$C_INDEX] + $STATIC_COMP_APPEND")

        # Store the updated component in our array
        APP_COMPONENTS+=("$COMP_UPD")

        # Increment index
        C_INDEX=$((C_INDEX+1))
    done

    C_INDEX=0
    # Iterate over components
    for appComponent in "${appcomponents[@]}"; do
        echo "$(cat values_merged.yaml | yq 'del(.appComponents[0])')" > ./values_merged.yaml

        # Increment index
        C_INDEX=$((C_INDEX+1))
    done

    # Put it all back together
    for appComponent in "${APP_COMPONENTS[@]}"; do
        APP_COMP_JSON=$(echo "$appComponent" | yq -o=json -I=0 '.')

        VALUES_UPD=$(cat values_merged.yaml | yq ".appComponents += $APP_COMP_JSON")
        echo "$VALUES_UPD" > values_merged.yaml
    done

    VALUES_UPD=$(cat values_merged.yaml | yq ". += $STATIC_APP_APPEND")
    echo "$VALUES_UPD" > values_merged.yaml

    helm upgrade --install $I_APP ../../setup/dep/generic-helm-chart \
        --values ./values_merged.yaml \
        -n $I_NS --atomic 1> /dev/null

    rm -rf ./values_merged.yaml
}

cd ..

echo "li14ebe14" | docker login registry.$DOMAIN --username mdundek --password-stdin

cp infra/dep/helm/helm .

docker build -t registry.$DOMAIN/mdos-api:latest .

rm -rf helm

docker push registry.$DOMAIN/mdos-api:latest

if [ ! -z $DO_EXPORT ]; then
    docker tag registry.$DOMAIN/mdos-api:latest mdos-api:latest
    docker save mdos-api:latest | gzip > ../setup/dep/mdos-api/mdos-api.tar.gz
fi

cd ./infra

if [ ! -z $DO_DEPLOY ]; then
    OIDC_DISCOVERY=$(curl "https://keycloak.$DOMAIN/realms/mdos/.well-known/openid-configuration")
    OIDC_ISSUER_URL=$(echo $OIDC_DISCOVERY | jq -r .issuer)
    OIDC_JWKS_URI=$(echo $OIDC_DISCOVERY | jq -r .jwks_uri) 

    helm uninstall mdos-api -n mdos

    # Deploy keycloak
    cat ../../setup/dep/mdos-api/values.yaml > ./target_values.yaml

    MDOS_ACBM_APP_UUID=$(cat ./target_values.yaml | yq eval '.mdosAcbmAppUUID')
    MDOS_ACBM_APP_CMP_UUID=$(cat ./target_values.yaml | yq eval '.appComponents[0].mdosAcbmAppCompUUID')
    MDOS_ACBM_APP_CMP_NAME=$(cat ./target_values.yaml | yq eval '.appComponents[0].name')

    mdos_deploy_app
    rm -rf ./target_values.yaml

    cat <<EOF | kubectl apply -f -
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: oidc-mdos-ra
  namespace: mdos
spec:
  jwtRules:
  - issuer: $OIDC_ISSUER_URL
    jwksUri: $OIDC_JWKS_URI
  selector:
    matchLabels:
      app: mdos-api
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: oidc-mdos-ap
  namespace: mdos
spec:
  action: CUSTOM
  provider:
    name: kc-mdos
  rules:
  - to:
    - operation:
        hosts:
        - "mdos-api.$DOMAIN"
  selector:
    matchLabels:
      mdosAcbmAppUUID: $MDOS_ACBM_APP_UUID
      mdosAcbmAppCompUUID: $MDOS_ACBM_APP_CMP_UUID
      mdosAcbmAppCompName: $MDOS_ACBM_APP_CMP_NAME
EOF

    POD_NAME=$(kubectl get pods -n mdos | grep "mdos-api-mdos-api" | grep "Running" | cut -d' ' -f 1)
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