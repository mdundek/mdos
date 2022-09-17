#!/bin/bash

source ./components.sh
source ./helpers.sh

pathRe='^/[A-Za-z0-9/_-]+$'

# COLLECT ADMIN CREDS
print_section_title "Admin user account"
user_input KEYCLOAK_USER "Enter a admin username for the platform:"
user_input KUBE_ADMIN_EMAIL "Enter the admin email address for the default keycloak client user:"
user_input KEYCLOAK_PASS "Enter a admin password for the platform:"

# CERT MODE
print_section_title "Domain name and certificate"
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
    user_input DOMAIN "Enter your DNS root domain name (ex. mydomain.com):" 
    set +Ee
    yes_no DNS_RESOLVABLE "Is your domain \"$DOMAIN\" resolvable through a public or private DNS server?"
    set -Ee
    if [ "$DNS_RESOLVABLE" == "no" ]; then
        context_print "MDos will need to know how to reach it's FTP server from within the"
        context_print "cluster without DNS resolution. An IP address is therefore required."
        echo ""

        unset LOOP_BREAK
        while [ -z $LOOP_BREAK ]; do
            user_input NODNS_LOCAL_IP "Please enter the local IP address for this machine:"
            if [[ $NODNS_LOCAL_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                LOOP_BREAK=1
            else
                error "Invalid IP address"
            fi
        done
    fi
else
    warn "Not implemented yet!"
    exit 1
fi

# LONGHORN
print_section_title "Kubernetes Storage"
context_print "MDos uses Longhorn as the primary storage class for your Kubernetes workload data volumes."
context_print "You can use Longhorn's default storage folder for this (/var/lib/longhorn), or specify"
context_print "your own folder path in case you want to mount a external disk as the storage target for"
context_print "your platform storage needs."
echo ""
set +Ee
yes_no CUSTOM_LH_PATH "Would you like to customize the directory path used by longhorn to mount your filesystems at?" 1
set -Ee

if [ "$CUSTOM_LH_PATH" == "yes" ]; then
    unset LOOP_BREAK
    while [ -z $LOOP_BREAK ]; do
        user_input LONGHORN_DEFAULT_DIR "Specify the path where you wish to store your cluster storage data at (absolute path):"
        if [[ ${LONGHORN_DEFAULT_DIR} =~ $pathRe ]]; then
            LOOP_BREAK=1
        else
            error "Invalid folder path"
        fi
    done
    if [ ! -d $LONGHORN_DEFAULT_DIR ]; then
        warn "This directory path does not exist."
        set +Ee
        yes_no CREATE_LG_PATH "Would you like to create this folder?"
        set -Ee
        if [ "$CREATE_LG_PATH" == "yes" ]; then
            mkdir -p $LONGHORN_DEFAULT_DIR
        else
            exit 1
        fi
    fi
fi

# REGISTRY
print_section_title "Private registry"
if [ -z $REGISTRY_SIZE ]; then
    context_print "MDos provides you with a private registry that you can use to store your application"
    context_print "images on. This registry is shared amongst all tenants on your cluster (ACL is"
    context_print "implemented to protect tenant specific images)."
    echo ""
    user_input REGISTRY_SIZE "How many Gi (Gigabytes) do you want to allocate to your registry volume:"
    re='^[0-9]+$'
    while ! [[ $REGISTRY_SIZE =~ $re ]] ; do
        error "Invalide number, ingeger representing Gigabytes is expected"
        user_input REGISTRY_SIZE "How many Gi do you want to allocate to your registry volume:"
    done
fi

# FTP
print_section_title "FTP volume sync server"
context_print "Users will be able to easiely synchronize / mirror their static datasets with application"
context_print "during deployments. This requires that the data is stored on the MDos platform so that"
context_print "the user who deploys his/her applications can synchronize that data with the platform"
context_print "upfront. Once done, the deploying application can automatically update / mirror those"
context_print "changes to your PODs before your application actually starts."
context_print "Please note that this data will remain on the MDos platform until the namespace / tenant"
context_print "is deleted, or that you explicitely requested a volume folder to be deleted."
context_print "Keeping the data available enables you to easiely do delta sync operations iteratively"
context_print "without having to upload it all every time you change your datasets."
context_print "You can store this buffered data on any partition folder you like."
echo ""

unset LOOP_BREAK
while [ -z $LOOP_BREAK ]; do
    user_input FTP_DATA_HOME "Enter a full path to use to store all tenant/namespace volume data for synchronization purposes:"
    if [[ ${FTP_DATA_HOME} =~ $pathRe ]]; then
        LOOP_BREAK=1
    else
        error "Invalid folder path"
    fi
done
if [ ! -d $FTP_DATA_HOME ]; then
    warn "This directory path does not exist."
    set +Ee
    yes_no CREATE_FTP_PATH "Would you like to create this folder?"
    set -Ee
    if [ "$CREATE_FTP_PATH" == "yes" ]; then
        mkdir -p $FTP_DATA_HOME
    else
        exit 1
    fi
fi