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

source ../cli/lib/components.sh
source ../cli/lib/helpers.sh

./cli/02_setup_env.sh --extended-registry
source ../cli/.env

# Preflight checks
if [ ! -f /etc/docker/certs.d/$REGISTRY_HOST/ca.crt ]; then
	./dep/80_prepare.sh
fi

# Check if namespace keycloak exists
while read NS_LINE ; do 
    NS_NAME=`echo "$NS_LINE" | cut -d' ' -f 1`
    if [ "$NS_NAME" == "keycloak" ]; then
        NS_FOUND=1
    fi
done < <(kubectl get ns 2>/dev/null)

# Collect user input
user_input KEYCLOAK_USER "Enter a admin username for Keycloak:"
user_input KEYCLOAK_PASS "Enter a admin password for Keycloak:"
user_input KEYCLOAK_DB_MOUNT "Enter the path to persist keycloak data:"
user_input KUBE_ADMIN_EMAIL "Enter the admin email address for the default keycloak client user:"

# Compute remaining parameters
POSTGRES_USER=$KEYCLOAK_USER
POSTGRES_PASSWORD=$KEYCLOAK_PASS
cd ../files/keycloak/pg-init-scripts
KEYCLOAK_DB_SCRIPT_MOUNT=$(pwd)
cd $_DIR

# Create / update keycloak values.yaml file
KEYCLOAK_VAL=$(cat ../files/keycloak/values.yaml)

KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[1].value = "'$POSTGRES_USER'"')
KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[2].value = "'$POSTGRES_PASSWORD'"')
KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[3].value = "'$KEYCLOAK_USER'"')
KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].config.data[4].value = "'$KEYCLOAK_PASS'"')
KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[0].hostPath = "'$KEYCLOAK_DB_MOUNT'"')
KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[1].hostPath = "'$KEYCLOAK_DB_SCRIPT_MOUNT'"')

KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[0].value = "'$KEYCLOAK_USER'"')
KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[1].value = "'$KEYCLOAK_PASS'"')
KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[2].value = "'$KEYCLOAK_USER'"')
KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].config.data[3].value = "'$KEYCLOAK_PASS'"')
KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].persistence.hostpathVolumes[0].hostPath = "'/etc/letsencrypt/live/$DOMAIN/fullchain.pem'"')
KEYCLOAK_VAL=$(echo "$KEYCLOAK_VAL" | yq '.appComponents[1].persistence.hostpathVolumes[1].hostPath = "'/etc/letsencrypt/live/$DOMAIN/privkey.pem'"')

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
	curl -k --request POST \
		https://keycloak.$DOMAIN/admin/realms \
		-H "Accept: application/json" \
        -H "Content-Type:application/json" \
        -H "Authorization: Bearer $KC_TOKEN" \
		-d '{"id": "mdos","realm": "mdos","rememberMe": true, "enabled": true}'
	gen_api_token
	curl -k --request POST \
		https://keycloak.$DOMAIN/admin/realms/mdos/clients \
		-H "Accept: application/json" \
        -H "Content-Type:application/json" \
        -H "Authorization: Bearer $KC_TOKEN" \
		--data-raw '{
			"clientId": "openresty",
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
        https://keycloak.$DOMAIN/admin/realms/mdos/clients?clientId=openresty | jq '.[0].id' | sed 's/[\"]//g')

	MDOS_CLIENT_SECRET=$(curl -s --location --request GET \
		https://keycloak.$DOMAIN/admin/realms/mdos/clients/$MDOS_CLIENT_UUID/client-secret \
		-H "Accept: application/json" \
        -H "Content-Type:application/json" \
        -H "Authorization: Bearer $KC_TOKEN" | jq '.value' | sed 's/[\"]//g')
	gen_api_token
	curl -k --request POST \
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
	MDOS_USER_UUID=$(curl --location --request GET \
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


# ################################################
# ############ TRY CATCH INTERCEPTORS ############
# ################################################
(
	set -Ee

	function _catch {
		# Rollback
		if [ ! -z $CATCH_LOG ]; then
			error "An error occured"
		fi
	}

	function _finally {
		# Cleanup
		rm -rf /home/$PLATFORM_USER/kc_tmp
		echo ""
	}

	trap _catch ERR
	trap _finally EXIT

	# Pull & push to images to registry
	docker pull postgres:13.2-alpine
	docker tag postgres:13.2-alpine $REGISTRY_HOST/postgres:13.2-alpine
	docker push $REGISTRY_HOST/postgres:13.2-alpine

	docker pull quay.io/keycloak/keycloak:18.0.2
	docker tag quay.io/keycloak/keycloak:18.0.2 $REGISTRY_HOST/keycloak:18.0.2
	docker push $REGISTRY_HOST/keycloak:18.0.2

	# Keycloak already deployed?
	if [ ! -z $NS_FOUND ]; then
		yes_no DO_DEL "The Keycloak namespace already exists. Prosceed anyway?" 1
		if [ "$DO_DEL" == "yes" ]; then
			kubectl delete ns keycloak
			rm -rf $KEYCLOAK_DB_MOUNT
		else
			exit 1
		fi
	fi

	# Create keycloak data folder if not exist
	mkdir -p $KEYCLOAK_DB_MOUNT

	# Create keycloak namespace
	kubectl create ns keycloak

	# Deploy keycloak on k3s
	cd ../cli
	CLI_HOME=$(pwd)
	cd $_DIR

	su - $PLATFORM_USER -c "mkdir -p /home/$PLATFORM_USER/kc_tmp"
	echo "$KEYCLOAK_VAL" > /home/$PLATFORM_USER/kc_tmp/values.yaml
	chown $PLATFORM_USER:$PLATFORM_USER /home/$PLATFORM_USER/kc_tmp/values.yaml

	su - $PLATFORM_USER -c "$CLI_HOME/mdos_deploy.sh /home/$PLATFORM_USER/kc_tmp"
	
	CATCH_LOG=1

	# Enable auth on openresty and reload config
	mv /home/$PLATFORM_USER/.mdos/openresty/conf.d/keycloak.conf.disabled /home/$PLATFORM_USER/.mdos/openresty/conf.d/keycloak.conf
	su - $PLATFORM_USER -c "$CLI_HOME/mdos_ssh.sh /home/$PLATFORM_USER/.mdos/openresty/conf.d -t openresty openresty -s reload"

	# Configure API key
	collect_api_key

	gen_api_token
	setup_keycloak_kubernetes_client

	gen_api_token
	setup_keycloak_mdos_realm

	sed -i "s/__KC_CLIENT_ID__/openresty/g" /home/$PLATFORM_USER/.mdos/openresty/conf.d/codeserver.conf
	sed -i "s/__KC_CLIENT_SECRET__/$MDOS_CLIENT_SECRET/g" /home/$PLATFORM_USER/.mdos/openresty/conf.d/codeserver.conf
	sed -i "s/__KC_CLIENT_ID__/openresty/g" /home/$PLATFORM_USER/.mdos/openresty/conf.d/default.conf
	sed -i "s/__KC_CLIENT_SECRET__/$MDOS_CLIENT_SECRET/g" /home/$PLATFORM_USER/.mdos/openresty/conf.d/default.conf
	sed -i 's/oidcenabled = false/oidcenabled = true/g' /home/$PLATFORM_USER/.mdos/openresty/conf.d/default.conf

	su - $PLATFORM_USER -c "$CLI_HOME/mdos_ssh.sh /home/$PLATFORM_USER/.mdos/openresty/conf.d -t openresty openresty -s reload"
)
