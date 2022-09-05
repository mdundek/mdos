#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

# ############################################
# ############## CHECKS & INIT ###############
# ############################################

if [ "$EUID" -ne 0 ]
    then echo "Please run as root"
    exit 1
fi

source ./lib/components.sh
source ./lib/helpers.sh

echo '
  __  __ ___   ___  ___    ___ ___ ___   ___    _  _______   _____ _    ___   _   _  __
 |  \/  |   \ / _ \/ __|  / _ \_ _|   \ / __|__| |/ / __\ \ / / __| |  / _ \ /_\ | |/ /
 | |\/| | |) | (_) \__ \ | (_) | || |) | (_|___| ' <| _| \ V / (__| |_| (_) / _ \| ' < 
 |_|  |_|___/ \___/|___/  \___/___|___/ \___|  |_|\_\___| |_| \___|____\___/_/ \_\_|\_\
                                                                                       
'   

# CHECK PACKAGE SYSTEM
if command -v apt-get >/dev/null; then
    PSYSTEM="APT"
elif command -v yum >/dev/null; then
    error "Unsupported linux package system"
    exit 1
else
    error "Unsupported linux package system"
    exit 1
fi

# DETERMINE DISTRO
UNAME=$(uname | tr "[:upper:]" "[:lower:]")
# If Linux, try to determine specific distribution
if [ "$UNAME" == "linux" ]; then
    # If available, use LSB to identify distribution
    if [ -f /etc/lsb-release -o -d /etc/lsb-release.d ]; then
        export DISTRO=$(lsb_release -i | cut -d: -f2 | sed s/'^\t'//)
    # Otherwise, use release info file
    else
        export DISTRO=$(ls -d /etc/[A-Za-z]*[_-][rv]e[lr]* | grep -v "lsb" | cut -d'/' -f3 | cut -d'-' -f1 | cut -d'_' -f1)
    fi
fi
# For everything else (or if above failed), just use generic identifier
[ "$DISTRO" == "" ] && export DISTRO=$UNAME
unset UNAME

# MAKE SURE DISTRO IS SUPPORTED
if [ "$DISTRO" == "" ]; then
    error "Unknown linux distribution"
    exit 1
elif [ "$DISTRO" != "Ubuntu" ]; then
    error "Unsupported linux distribution: ${DISTRO}"
    exit 1
fi

LOG_FILE="$HOME/$(date +'%m_%d_%Y_%H_%M_%S')_mdos_oidc_keycloak_install.log"

# Parse user input
# while [ "$1" != "" ]; do
#     case $1 in
#         --reset )
#             rm -rf $HOME/.mdos
#         ;;
#         * ) error "Invalid parameter detected: $1"
#             exit 1
#     esac
#     shift
# done

# LOAD INSTALLATION TRACKING LOGS
INST_ENV_PATH="$HOME/.mdos/install.dat"
mkdir -p "$HOME/.mdos"
if [ -f $INST_ENV_PATH ]; then
    source $INST_ENV_PATH
else
    touch $HOME/.mdos/install.dat
fi

# ############### UPDATE ENV DATA VALUE ################
set_env_step_data() {
    sed -i '/'$1'=/d' $INST_ENV_PATH
    echo "$1=$2" >> $INST_ENV_PATH
}

# ############### CHECK KUBE RESOURCE ################
check_kube_resource() {
    local __resultvar=$1
    while read K_LINE ; do 
        K_NAME=`echo "$K_LINE" | cut -d' ' -f 1`
        if [ "$K_NAME" == "$4" ]; then
            eval $__resultvar=1
        fi
    done < <(kubectl get $2 -n $3 2>/dev/null)
}

check_kube_namespace() {
    local __resultvar=$1
    while read K_LINE ; do 
        K_NAME=`echo "$K_LINE" | cut -d' ' -f 1`
        if [ "$K_NAME" == "$2" ]; then
            eval $__resultvar=1
        fi
    done < <(kubectl get ns 2>/dev/null)
}

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
    STATIC_APP_APPEND='{"registry": "registry.'$DOMAIN'","enabled": true,"developement": false,"appInternalName": "'$I_APP'","nodeSelector":{},"tolerations":[],"affinity":{},"isMdosApp": true, "global": {"imagePullPolicy":"IfNotPresent","config": [],"secrets": []}}'

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

    helm upgrade --install $I_APP ./dep/generic-helm-chart \
        --values ./values_merged.yaml \
        -n $I_NS --atomic 1> /dev/null

    rm -rf ./values_merged.yaml
}

# ############################################
# ############### CONFIG ISTIO ###############
# ############################################
configure_istio() {
    echo "meshConfig:
  accessLogFile: /dev/stdout
  extensionProviders:
  - name: oauth2-proxy-keycloak
    envoyExtAuthzHttp:
      service: oauth2-proxy-keycloak.oauth2-proxy.svc.cluster.local
      port: 4180
      includeRequestHeadersInCheck:
      - cookie
      - x-forwarded-access-token
      headersToUpstreamOnAllow:
      - authorization
      - cookie
      - path
      - x-auth-request-access-token
      - x-auth-request-user
      - x-auth-request-groups
      - x-auth-request-email
      - x-forwarded-access-token
      headersToDownstreamOnDeny:
      - set-cookie
      - content-type" > $_DIR/istiod-values.yaml
    helm upgrade --install istiod ./dep/istio_helm/istio-control/istio-discovery -f $_DIR/istiod-values.yaml -n istio-system &>> $LOG_FILE

    info "Waiting for istiod to become ready..."
    ATTEMPTS=0
    while [ "$(kubectl get pod -n istio-system | grep 'istiod-' | grep 'Running')" == "" ]; do
        sleep 3
        ATTEMPTS=$((ATTEMPTS+1))
        if [ "$ATTEMPTS" -gt 100 ]; then
            error "Timeout, Istio did not deploy in time. Please check with the command 'kubectl get pod -n istio-system' and 'kubectl describe pod <pod name> -n istio-system' for more information about the issue"
            exit 1
        fi
    done
}

# ############################################
# ########### INSTALL OAUTH2-PROXY ###########
# ############################################
install_oauth2_proxy() {
    helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests
    helm repo update
    kubectl create ns oauth2-proxy && kubectl label ns oauth2-proxy istio-injection=enabled

    # oidc_issuer_url=\"https://keycloak.$DOMAIN/realms/mdos\"
    # profile_url=\"https://keycloak.$DOMAIN/realms/mdos/protocol/openid-connect/userinfo\"
    # validate_url=\"https://keycloak.$DOMAIN/realms/mdos/protocol/openid-connect/userinfo\"

    echo "service:
  portNumber: 4180
config:
  clientID: \"mdos\"
  clientSecret: \"$MDOS_CLIENT_SECRET\"
  cookieSecret: \"$COOKIE_SECRET\"
  cookieName: \"_oauth2_proxy\"
  configFile: |-
    provider = \"oidc\"
    oidc_issuer_url=\"$OIDC_ISSUER_URL\"
    profile_url=\"$OIDC_USERINPUT_URI\"
    validate_url=\"$OIDC_USERINPUT_URI\"
    scope=\"openid email profile roles\"
    pass_host_header = true
    reverse_proxy = true
    auth_logging = true
    cookie_httponly = true
    cookie_refresh = \"4m\"
    cookie_secure = true
    email_domains = \"*\"
    pass_access_token = true
    pass_authorization_header = true
    request_logging = true
    session_store_type = \"cookie\"
    set_authorization_header = true
    set_xauthrequest = true
    silence_ping_logging = true
    skip_provider_button = true
    skip_auth_strip_headers = false
    skip_jwt_bearer_tokens = true
    ssl_insecure_skip_verify = true
    standard_logging = true
    upstreams = [ \"static://200\" ]
    whitelist_domains = [\".$DOMAIN\"]" > $_DIR/oauth2-proxy-values.yaml

    helm upgrade --install -n oauth2-proxy \
      --version 6.0.1 \
      --values $_DIR/oauth2-proxy-values.yaml \
      oauth2-proxy-keycloak oauth2-proxy/oauth2-proxy --atomic
}

# ############################################
# ################# KEYCLOAK #################
# ############################################
install_keycloak() {
    if [ -z $KEYCLOAK_USER ]; then
        user_input KEYCLOAK_USER "Enter a admin username for Keycloak:"
        set_env_step_data "KEYCLOAK_USER" "$KEYCLOAK_USER"
    fi

    if [ -z $KEYCLOAK_PASS ]; then
        user_input KEYCLOAK_PASS "Enter a admin password for Keycloak:"
        set_env_step_data "KEYCLOAK_PASS" "$KEYCLOAK_PASS"
    fi

    if [ -z $KUBE_ADMIN_EMAIL ]; then
        user_input KUBE_ADMIN_EMAIL "Enter the admin email address for the default keycloak client user:"
        set_env_step_data "KUBE_ADMIN_EMAIL" "$KUBE_ADMIN_EMAIL"
    fi

    # Create keycloak namespace & secrets for registry
    unset NS_EXISTS
    check_kube_namespace NS_EXISTS "keycloak"
    if [ -z $NS_EXISTS ]; then
        kubectl create namespace keycloak &>> $LOG_FILE
    fi

    # Compute remaining parameters
    POSTGRES_USER=$KEYCLOAK_USER
    POSTGRES_PASSWORD=$KEYCLOAK_PASS
    KEYCLOAK_DB_SCRIPT_MOUNT=$(pwd)/dep/keycloak/pg-init-scripts
    
    # Create / update keycloak values.yaml file
    KEYCLOAK_VAL=$(cat ./dep/keycloak/values.yaml)

    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[1].value = "'$POSTGRES_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[2].value = "'$POSTGRES_PASSWORD'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[3].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[4].value = "'$KEYCLOAK_PASS'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[0].hostPath = "'$HOME'/.mdos/keycloak/db"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[1].hostPath = "'$KEYCLOAK_DB_SCRIPT_MOUNT'"')

    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[0].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[1].value = "'$KEYCLOAK_PASS'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[2].value = "'$KEYCLOAK_USER'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[3].value = "'$KEYCLOAK_PASS'"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].persistence.hostpathVolumes[0].hostPath = "'$SSL_ROOT'/fullchain.pem"')
    KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].persistence.hostpathVolumes[1].hostPath = "'$SSL_ROOT'/privkey.pem"')

    collect_api_key() {
        echo ""
        echo ""
        question "To finalyze the setup, do the following:"
        echo ""
        echo "  1. Open a browser and go to:"
        warn_print "     https://keycloak.$DOMAIN/admin/master/console/#/realms/master/clients"
        echo "  2. From the 'Clients' section, click on the client 'master-realm'"
        echo "  3. Change 'Access Type' value to 'confidential'"
        echo "  4. Enable the boolean value 'Service Accounts Enabled'"
        echo "  5. Set 'Valid Redirect URIs' value to '*'"
        echo "  6. Save those changes (button at the bottom of the page)"
        echo "  7. In tab 'Roles', Click on button 'edit' for role 'magage realm'."
        echo "     Enable 'Composite roles' and add 'admin' realm to associated roles"
        echo "  8. Go to the 'Service Account Roles' tab and add the role 'admin' to the 'Assigned Roles' box"
        echo "  9. Click on tab 'Credentials'"
        echo " 10. When ready, copy and paste the 'Secret' value into this terminal, then press enter:"
        echo ""
        user_input KEYCLOAK_SECRET "SECRET:"
        echo ""
    } 

    gen_api_token() {
        KC_TOKEN=$(curl -s -k -X POST \
            "https://keycloak.$DOMAIN/realms/master/protocol/openid-connect/token" \
            -H "Content-Type: application/x-www-form-urlencoded"  \
            -d "grant_type=client_credentials" \
            -d "client_id=master-realm" \
            -d "client_secret=$KEYCLOAK_SECRET" \
            -d "username=$KEYCLOAK_USER"  \
            -d "password=$KEYCLOAK_PASS" \
            -d "scope=openid" | jq -r '.access_token')
    }

    setup_keycloak_kubernetes_client() {
        # Create client for kubernetes
        curl -s -k --request POST \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            -d '{"clientId": "kubernetes-cluster", "publicClient": true, "standardFlowEnabled": true, "directGrantsOnly": true, "redirectUris": ["*"], "protocolMappers": [{"name": "groups", "protocol": "openid-connect", "protocolMapper": "oidc-group-membership-mapper", "config": {"claim.name" : "groups", "full.path" : "true","id.token.claim" : "true", "access.token.claim" : "true", "userinfo.token.claim" : "true"}}]}' \
            https://keycloak.$DOMAIN/admin/realms/master/clients

        # Retrieve client UUID
        CLIENT_UUID=$(curl -s -k --request GET \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            https://keycloak.$DOMAIN/admin/realms/master/clients?clientId=kubernetes-cluster | jq '.[0].id' | sed 's/[\"]//g')

        # Create mdos base group for k8s clusters in Keycloak
        curl -s -k --request POST \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            -d '{"name": "mdos"}' \
            https://keycloak.$DOMAIN/admin/realms/master/groups

        # Create client roles in Keycloak
        curl -s -k --request POST \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            --data '{"clientRole": true,"name": "mdos-sysadmin"}' \
            https://keycloak.$DOMAIN/admin/realms/master/clients/$CLIENT_UUID/roles

        SYSADMIN_ROLE_UUID=$(curl -s -k --request GET \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            https://keycloak.$DOMAIN/admin/realms/master/clients/$CLIENT_UUID/roles/mdos-sysadmin | jq '.id' | sed 's/[\"]//g')

        # Update admin email and role
        ADMIN_U_ID=$(curl -s -k --request GET \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            https://keycloak.$DOMAIN/admin/realms/master/users?username=$KEYCLOAK_USER | jq '.[0].id' | sed 's/[\"]//g')

        curl -s -k -X PUT \
            https://keycloak.$DOMAIN/admin/realms/master/users/$ADMIN_U_ID \
            -H "Content-Type: application/json"  \
            -H "Authorization: Bearer $KC_TOKEN" \
            -d '{"email": "'"$KUBE_ADMIN_EMAIL"'"}'

        curl -s -k --request POST \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            --data '[{"name": "mdos-sysadmin", "id": "'"$SYSADMIN_ROLE_UUID"'"}]' \
            https://keycloak.$DOMAIN/admin/realms/master/users/$ADMIN_U_ID/role-mappings/clients/$CLIENT_UUID
    }

    setup_keycloak_mdos_realm() {
        curl -k -s --request POST \
            https://keycloak.$DOMAIN/admin/realms \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            -d '{"id": "mdos","realm": "mdos","rememberMe": true, "enabled": true}'
        gen_api_token
        curl -k -s --request POST \
            https://keycloak.$DOMAIN/admin/realms/mdos/clients \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            --data-raw '{
                "clientId": "mdos",
                "rootUrl": "",
                "baseUrl": "",
                "surrogateAuthRequired": false,
                "enabled": true,
                "alwaysDisplayInConsole": false,
                "clientAuthenticatorType": "client-secret",
                "redirectUris": [
                    "*"
                ],
                "webOrigins": [],
                "notBefore": 0,
                "bearerOnly": false,
                "consentRequired": false,
                "standardFlowEnabled": true,
                "implicitFlowEnabled": false,
                "directAccessGrantsEnabled": true,
                "serviceAccountsEnabled": true,
                "authorizationServicesEnabled": true,
                "publicClient": false,
                "frontchannelLogout": false,
                "protocol": "openid-connect",
                "attributes": {
                    "saml.multivalued.roles": "false",
                    "saml.force.post.binding": "false",
                    "frontchannel.logout.session.required": "false",
                    "oauth2.device.authorization.grant.enabled": "true",
                    "backchannel.logout.revoke.offline.tokens": "false",
                    "saml.server.signature.keyinfo.ext": "false",
                    "use.refresh.tokens": "true",
                    "oidc.ciba.grant.enabled": "false",
                    "backchannel.logout.session.required": "true",
                    "client_credentials.use_refresh_token": "false",
                    "saml.client.signature": "false",
                    "require.pushed.authorization.requests": "false",
                    "saml.allow.ecp.flow": "false",
                    "saml.assertion.signature": "false",
                    "id.token.as.detached.signature": "false",
                    "client.secret.creation.time": "1658151759",
                    "saml.encrypt": "false",
                    "saml.server.signature": "false",
                    "exclude.session.state.from.auth.response": "false",
                    "saml.artifact.binding": "false",
                    "saml_force_name_id_format": "false",
                    "tls.client.certificate.bound.access.tokens": "false",
                    "acr.loa.map": "{}",
                    "saml.authnstatement": "false",
                    "display.on.consent.screen": "false",
                    "token.response.type.bearer.lower-case": "false",
                    "saml.onetimeuse.condition": "false"
                },
                "authenticationFlowBindingOverrides": {},
                "fullScopeAllowed": true,
                "nodeReRegistrationTimeout": -1,
                "protocolMappers": [
                    {
                        "name": "Client ID",
                        "protocol": "openid-connect",
                        "protocolMapper": "oidc-usersessionmodel-note-mapper",
                        "consentRequired": false,
                        "config": {
                            "user.session.note": "clientId",
                            "id.token.claim": "true",
                            "access.token.claim": "true",
                            "claim.name": "clientId",
                            "jsonType.label": "String"
                        }
                    },
                    {
                        "name": "Client Host",
                        "protocol": "openid-connect",
                        "protocolMapper": "oidc-usersessionmodel-note-mapper",
                        "consentRequired": false,
                        "config": {
                            "user.session.note": "clientHost",
                            "id.token.claim": "true",
                            "access.token.claim": "true",
                            "claim.name": "clientHost",
                            "jsonType.label": "String"
                        }
                    },
                    {
                        "name": "Client IP Address",
                        "protocol": "openid-connect",
                        "protocolMapper": "oidc-usersessionmodel-note-mapper",
                        "consentRequired": false,
                        "config": {
                            "user.session.note": "clientAddress",
                            "id.token.claim": "true",
                            "access.token.claim": "true",
                            "claim.name": "clientAddress",
                            "jsonType.label": "String"
                        }
                    }
                ],
                "defaultClientScopes": [
                    "web-origins",
                    "acr",
                    "profile",
                    "roles",
                    "email"
                ],
                "optionalClientScopes": [
                    "address",
                    "phone",
                    "offline_access",
                    "microprofile-jwt"
                ],
                "access": {
                    "view": true,
                    "configure": true,
                    "manage": true
                }
            }'
        gen_api_token
        MDOS_CLIENT_UUID=$(curl -s -k --request GET \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            https://keycloak.$DOMAIN/admin/realms/mdos/clients?clientId=mdos | jq '.[0].id' | sed 's/[\"]//g')

        MDOS_CLIENT_SECRET=$(curl -k -s --location --request GET \
            https://keycloak.$DOMAIN/admin/realms/mdos/clients/$MDOS_CLIENT_UUID/client-secret \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" | jq '.value' | sed 's/[\"]//g')
        gen_api_token
        curl -k -s --request POST \
            https://keycloak.$DOMAIN/admin/realms/mdos/users \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            --data-raw '{
                "username": "'$KEYCLOAK_USER'",
                "enabled": true,
                "totp": false,
                "emailVerified": true,
                "email": "'$KUBE_ADMIN_EMAIL'",
                "disableableCredentialTypes": [],
                "requiredActions": [],
                "notBefore": 0,
                "access": {
                    "manageGroupMembership": true,
                    "view": true,
                    "mapRoles": true,
                    "impersonate": true,
                    "manage": true
                }
            }'
        gen_api_token
        MDOS_USER_UUID=$(curl -k -s --location --request GET \
            https://keycloak.$DOMAIN/admin/realms/mdos/users \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" | jq '.[0].id' | sed 's/[\"]//g')

        curl -s -k --request PUT \
            https://keycloak.$DOMAIN/admin/realms/mdos/users/$MDOS_USER_UUID/reset-password \
            -H "Accept: application/json" \
            -H "Content-Type:application/json" \
            -H "Authorization: Bearer $KC_TOKEN" \
            --data-raw '{"type":"password","value":"'$KEYCLOAK_PASS'","temporary":false}'
    }

    echo "${REG_PASS}" | docker login registry.$DOMAIN --username ${REG_USER} --password-stdin &>> $LOG_FILE

    # Pull & push images to registry
	docker pull postgres:13.2-alpine &>> $LOG_FILE
	docker tag postgres:13.2-alpine registry.$DOMAIN/postgres:13.2-alpine &>> $LOG_FILE
	docker push registry.$DOMAIN/postgres:13.2-alpine &>> $LOG_FILE

	docker pull quay.io/keycloak/keycloak:18.0.2 &>> $LOG_FILE
	docker tag quay.io/keycloak/keycloak:18.0.2 registry.$DOMAIN/keycloak:18.0.2 &>> $LOG_FILE
	docker push registry.$DOMAIN/keycloak:18.0.2 &>> $LOG_FILE

    mkdir -p $HOME/.mdos/keycloak/db

    # Deploy keycloak
    echo "$KEYCLOAK_VAL" > ./target_values.yaml

    mdos_deploy_app &>> $LOG_FILE
    rm -rf ./target_values.yaml

	# Configure API key
	collect_api_key

	gen_api_token
	setup_keycloak_kubernetes_client

	gen_api_token
	setup_keycloak_mdos_realm
}

# ############################################
# ################# ETC_HOSTS ################
# ############################################
configure_etc_hosts() {
    if [ "$(cat /etc/hosts | grep keycloak.$DOMAIN)" == "" ]; then
        echo "127.0.0.1 keycloak.$DOMAIN" >> /etc/hosts
    fi
}

# ###########################################################################################################################
# ########################################################### MAIN ##########################################################
# ###########################################################################################################################
(
    set -Ee

    function _catch {
        GLOBAL_ERROR=1
        # Rollback
        echo ""
        error "An error occured"
        
    }

    function _finally {
        # Cleanup
        info "Cleaning up..."
        
        rm -rf $_DIR/istiod-values.yaml
        rm -rf $_DIR/oauth2-proxy-values.yaml

        ALL_IMAGES="$(docker images)"

        if [ "$(echo "$ALL_IMAGES" | grep "registry.$DOMAIN/keycloak" | grep "18.0.2")" != "" ]; then
            docker rmi registry.$DOMAIN/keycloak:18.0.2 &>> $LOG_FILE
        fi

        if [ "$(echo "$ALL_IMAGES" | grep "registry.$DOMAIN/postgres" | grep "13.2-alpine")" != "" ]; then
            docker rmi registry.$DOMAIN/postgres:13.2-alpine &>> $LOG_FILE
        fi

        if [ "$(echo "$ALL_IMAGES" | grep "quay.io/keycloak/keycloak" | grep "18.0.2")" != "" ]; then
            docker rmi quay.io/keycloak/keycloak:18.0.2 &>> $LOG_FILE
        fi

        if [ "$(echo "$ALL_IMAGES" | grep "postgres" | grep "13.2-alpine")" != "" ]; then
            docker rmi postgres:13.2-alpine &>> $LOG_FILE
        fi

        echo ""

        note_print "Log details of the nstallation can be found here: $LOG_FILE"

        if [ -z $GLOBAL_ERROR ]; then
            info "Done!"
        fi
    }

    trap _catch ERR
    trap _finally EXIT

    echo ""

    # CONFIGURE ISTIO
    if [ -z $INST_STEP_ISTIO ]; then
        info "Install Istio..."
        configure_istio
        set_env_step_data "INST_STEP_ISTIO" "1"
    fi

    if [ "$CERT_MODE" == "SELF_SIGNED" ]; then
        configure_etc_hosts
    fi

    # INSTALL KEYCLOAK
    if [ -z $INST_STEP_KEYCLOAK ]; then
        info "Install Keycloak..."
        echo ""
        install_keycloak
        set_env_step_data "MDOS_CLIENT_SECRET" "$MDOS_CLIENT_SECRET"
        set_env_step_data "INST_STEP_KEYCLOAK" "1"
    fi

    # LOAD OAUTH2 DATA
    OIDC_DISCOVERY=$(curl "https://keycloak.$DOMAIN/realms/mdos/.well-known/openid-configuration")
    OIDC_ISSUER_URL=$(echo $OIDC_DISCOVERY | jq -r .issuer)
    OIDC_JWKS_URI=$(echo $OIDC_DISCOVERY | jq -r .jwks_uri) 
    OIDC_USERINPUT_URI=$(echo $OIDC_DISCOVERY | jq -r .userinfo_endpoint)
    COOKIE_SECRET=$(openssl rand -base64 32 | tr -- '+/' '-_')
    CLIENT_ID="mdos"

    # INSTALL OAUTH2 PROXY
    if [ -z $INST_STEP_OAUTH ]; then
        info "Install OAuth2 proxy..."
        echo ""
        install_oauth2_proxy
        set_env_step_data "INST_STEP_OAUTH" "1"
    fi
)