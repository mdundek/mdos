#!/bin/bash

# COLLECT ADMIN CREDS
user_input KEYCLOAK_USER "Enter a admin username for the platform:"
user_input KUBE_ADMIN_EMAIL "Enter the admin email address for the default keycloak client user:"
user_input KEYCLOAK_PASS "Enter a admin password for the platform:"

# CERT MODE
OPTIONS_STRING="You already have a certificate and a wild card domain;You have a Cloudflare domain, but no certificates;Generate and use self signed, do not have a domain"
OPTIONS_VALUES=("SSL_PROVIDED" "CLOUDFLARE" "SELF_SIGNED")
set +Ee
prompt_for_select CMD_SELECT "$OPTIONS_STRING"
set -Ee
for i in "${!CMD_SELECT[@]}"; do
    if [ "${CMD_SELECT[$i]}" == "true" ]; then
        CERT_MODE="${OPTIONS_VALUES[$i]}"
    fi
done

# PREPARE CERTIFICATES & DOMAIN
if [ "$CERT_MODE" == "CLOUDFLARE" ]; then
    user_input DOMAIN "Enter your DNS root domain name (ex. mydomain.com):" 
    user_input CF_EMAIL "Enter your Cloudflare account email:"
    user_input CF_TOKEN "Enter your Cloudflare API token:"
elif [ "$CERT_MODE" == "SELF_SIGNED" ]; then
    yes_no DNS_RESOLVABLE "Is your domain \"$DOMAIN\" resolvable through a public or private DNS server?"
    if [ "$DNS_RESOLVABLE" == "no" ]; then
        question "MDos will need to know how to reach it's FTP server from within the cluster without DNS resolution. An IP address is therefore required."
        echo ""
        user_input NODNS_LOCAL_IP "Please enter the local IP address for this machine:"
    fi
fi

# Install Longhorn
question "MDos uses Longhorn as the primary storage class for your Kubernetes workload data volumes."
question "You can use Longhorn's default storage folder for this (root user partition), or specify your own folder path in case you want to mount a external disk as the storage target for your platform storage needs."
echo ""
yes_no CUSTOM_LH_PATH "Would you like to customize the directory path used by longhorn to mount your filesystems at?" 1

if [ "$CUSTOM_LH_PATH" == "yes" ]; then
    user_input LONGHORN_DEFAULT_DIR "Specify the path where you wish to store your cluster storage data at:"
    while [ ! -d $LONGHORN_DEFAULT_DIR ]; do
        error "Directory does not exist"
        user_input LONGHORN_DEFAULT_DIR "Specify the path where you wish to store your cluster storage data at:"
    done
fi

# collect_reg_pv_size
if [ -z $REGISTRY_SIZE ]; then
    # Collect registry size
    question "MDos provides you with a private registry that you can use to store your application images on. This registry is shared amongst all tenants on your cluster (ACL is implemented to protect tenant specific images)."
    echo ""
    user_input REGISTRY_SIZE "How many Gi (Gigabytes) do you want to allocate to your registry volume:"
    re='^[0-9]+$'
    while ! [[ $REGISTRY_SIZE =~ $re ]] ; do
        error "Invalide number, ingeger representing Gigabytes is expected"
        user_input REGISTRY_SIZE "How many Gi do you want to allocate to your registry volume:"
    done
fi

# install_helm_ftp
question "Users will be able to easiely synchronize / mirror their static datasets with application during deployments. This requires that the data is stored on the MDos platform so that the user who deploys his/her applications can synchronize that data with the platform upfront. Once done, the deploying application can automatically update / mirror those changes to your PODs before your application actually starts."
question "Please note that this data will remain on the MDos platform until the namespace / tenant is deleted, or that you explicitely requested a volume folder to be deleted."
question "Keeping the data available enables you to easiely do delta sync operations iteratively without having to upload it all every time you change your datasets."
question "You can store this buffered data on any partition folder you like."
echo ""
user_input FTP_DATA_HOME "Enter a full path to use to store all tenant/namespace volume data for synchronization purposes:"
while [ ! -d $FTP_DATA_HOME ] ; do
    error "Invalide path or path does not exist"
    user_input FTP_DATA_HOME "Enter a full path to use to store all tenant/namespace volume data for synchronization purposes:"
done