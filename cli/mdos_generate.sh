#!/bin/bash

CDIR=$1

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source .env

source ./lib/components.sh
source ./lib/helpers.sh

GEN_TYPE=$2

if [ -z $GEN_TYPE ]; then
    error "Missing argument, expected \"application\" or \"component\""
    exit 1
fi

# ========================================================================
generate_app_comp_yaml() {
    # Export vars for yaml generation
    app_comp_name=$1
    app_comp_id=$2
    app_image=$3
    app_tag=$4
    app_expose_port=$5
    app_expose_host=$6

    APP_COMP_YAML=$(cat templates/values_app_comp.yaml)

    APP_COMP_YAML=$(echo "$APP_COMP_YAML" | yq '.mdosAcbmAppCompUUID = "'$app_comp_id'"')
    APP_COMP_YAML=$(echo "$APP_COMP_YAML" | yq '.image.repository = "'$app_image'"')
    APP_COMP_YAML=$(echo "$APP_COMP_YAML" | yq '.image.tag = "'$app_tag'"')

    if [ "$APP_COMP_EXPOSE" == "yes" ]; then
        APP_COMP_YAML=$(echo "$APP_COMP_YAML" | yq '.virtualService[0].hosts[0] = "'$app_expose_host'"')
        APP_COMP_YAML=$(echo "$APP_COMP_YAML" | yq '.virtualService[0].httpMatch.port = "443"')
        APP_COMP_YAML=$(echo "$APP_COMP_YAML" | yq '.virtualService[0].svcPort = "'$app_expose_port'"')
        APP_COMP_YAML=$(echo "$APP_COMP_YAML" | yq '.virtualService[0].oidcAuth = true')
        APP_COMP_YAML=$(echo "$APP_COMP_YAML" | yq '.virtualService[0].oidcIssuerUri = '$OIDC_ISSUER_URI)
        APP_COMP_YAML=$(echo "$APP_COMP_YAML" | yq '.virtualService[0].oidcJwksUri = '$OIDC_JWKS_URI)
    else
        APP_COMP_YAML=$(echo "$APP_COMP_YAML" | yq 'del(.virtualService[0])')
    fi

    APP_COMP_YAML=$(echo "$APP_COMP_YAML" | sed -e 's/^/    /')
    APP_COMP_YAML_ALL="$APP_COMP_YAML_ALL
  - name: $app_comp_name
$APP_COMP_YAML"

    #APP_COMP_YAML_ARRAY+=("$APP_COMP_YAML")

    #echo "$APP_COMP_YAML" | yq -o=json
}

# ========================================================================
collect_app_params() {
    # Application name
    regex_user_input APP_NAME "Enter application name:" "my-app" "k8s-name"

    # Application namespace
    regex_user_input APP_NS "Enter application target namespace:" "my-ns" "k8s-name"
}

# ========================================================================
collect_app_comp_params() {
    # Application name
    regex_user_input APP_COMP_NAME "Enter application component id:" "backend" "k8s-name"

    # Image name
    regex_user_input APP_COMP_IMG "Enter application component image name:" "$APP_COMP_NAME" "docker-img"

    # Expose by creating virtualservice?
    set +Ee
    yes_no APP_COMP_EXPOSE "Do you want to expose the application outside of the cluster"
    set -Ee

    if [ "$APP_COMP_EXPOSE" == "yes" ]; then
        # URL for virtualhost
        regex_user_input APP_COMP_HOST "Enter the component target host name:" "$APP_COMP_NAME.$DOMAIN" "hostname"
    fi

    generate_app_comp_yaml "$APP_COMP_NAME" "$(uuidgen)" "$APP_COMP_IMG" "latest" "80" "$(if [ -z $APP_COMP_HOST ]; then echo "na";else echo "$APP_COMP_HOST";fi)"
}

# ========================================================================
generate_app_values_yaml() {
    # Export vars for yaml generation
    app_name=$APP_NAME
    app_ns=$APP_NS
    app_id="$(uuidgen)"
    app_comp_list=$( IFS=$'\n'; echo "${APP_COMP_YAML_ARRAY[*]}" )

    APP_YAML=$(cat templates/values_app.yaml)

    APP_YAML=$(echo "$APP_YAML" | yq '.mdosAcbmAppUUID = "'$app_id'"')
    APP_YAML=$(echo "$APP_YAML" | yq '.mdosBundleName = "'$app_ns'"')
    APP_YAML=$(echo "$APP_YAML" | yq '.appName = "'$app_name'"')

    echo "$APP_YAML    
appComponents:" > $APP_PATH/values.yaml
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
        rm -rf $CDIR/mdostemp.yaml
        rm -rf $CDIR/values_app.yaml
        rm -rf $CDIR/values_app_comp.yaml
    }

    trap _catch ERR
    trap _finally EXIT
  
    # ############### EXECUTE ################
    APP_COMP_YAML_ARRAY=()
    APP_COMP_YAML_ALL=""

    if [ "$GEN_TYPE" == "application" ]; then
        collect_app_params

        APP_PATH=$CDIR/$APP_NAME

        mkdir -p $APP_PATH

        generate_app_values_yaml

        info "Done"
    elif [ "$GEN_TYPE" == "component" ]; then
        if [ ! -f $CDIR/values.yaml ]; then
            error "Missing values.yaml file, cant generate component"
            exit 1
        fi

        collect_app_comp_params

        mkdir $CDIR/$APP_COMP_NAME

        touch $CDIR/$APP_COMP_NAME/Dockerfile

        echo "$APP_COMP_YAML_ALL" >> $CDIR/values.yaml
        info "Done"
    else
        error "Wrong argument, expected \"application\" or \"component\""
        exit 1
    fi 
)