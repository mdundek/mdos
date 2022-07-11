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
    export app_comp_name=$1
    export app_comp_id=$2
    export app_image=$3
    export app_tag=$4
    export app_expose_port=$5
    export app_expose_host=$6

    # Generate temp secret values yaml file
    ( echo "cat <<EOF >$CDIR/values_app_comp.yaml";
      cat templates/values_app_comp.yaml;
      echo "
EOF";
    ) >$CDIR/mdostemp.yaml
    . $CDIR/mdostemp.yaml

    rm -rf $CDIR/mdostemp.yaml

    APP_COMP_YAML=$(cat $CDIR/values_app_comp.yaml)

    if [ "$APP_COMP_EXPOSE" == "yes" ]; then
        APP_COMP_YAML="$APP_COMP_YAML

      # Create a service to make your application reachable from other components
      service:
        create: true
        type: ClusterIP
        portMappings:
          - port: 80
            containerPort: 80
"
    else
        APP_COMP_YAML="$APP_COMP_YAML

      # Create a service to make your application reachable from other components
      service:
        create: false
"
    fi

    rm -rf $CDIR/values_app_comp.yaml
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
        regex_user_input APP_COMP_HOST "Enter the component target host name:" "$APP_COMP_NAME.mdundek.network" "hostname"
    fi

    generate_app_comp_yaml "$APP_COMP_NAME" "$(uuidgen)" "$APP_COMP_IMG" "latest" "80" "$(if [ -z $APP_COMP_HOST ]; then echo "na";else echo "$APP_COMP_HOST";fi)"
}

# ========================================================================
generate_app_values_yaml() {
    # Export vars for yaml generation
    export app_name=$APP_NAME
    export app_ns=$APP_NS
    export registry=$REGISTRY_HOST
    export app_id="$(uuidgen)"
    app_comp_list=$( IFS=$'\n'; echo "${APP_COMP_YAML_ARRAY[*]}" )

    # Generate temp secret values yaml file
    ( echo "cat <<EOF >$APP_PATH/values_app.yaml";
        cat templates/values_app.yaml;
        echo "
EOF";
    ) >$APP_PATH/mdostemp.yaml
    . $APP_PATH/mdostemp.yaml

    rm -rf $APP_PATH/mdostemp.yaml

    APP_YAML=$(cat $APP_PATH/values_app.yaml)

    rm -rf $APP_PATH/values_app.yaml

    echo "$APP_YAML" > $APP_PATH/values.yaml
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

        echo "" >> $CDIR/values.yaml
        echo "$APP_COMP_YAML" >> $CDIR/values.yaml
        info "Done"
    else
        error "Wrong argument, expected \"application\" or \"component\""
        exit 1
    fi 
)