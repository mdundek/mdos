#!/bin/bash

# ############################################
# ############## CHECKS & INIT ###############
# ############################################

if [ "$EUID" -ne 0 ]
    then echo "Please run as root"
    exit 1
fi

command_exists() {
    {
        command -v $1
        if [ $? -eq 0 ]; then
            echo "OK"
        else
            echo "KO"
        fi
    } || {
        echo "KO"
    }
}

os_check() {
    # CHECK PACKAGE SYSTEM
    if command -v apt-get >/dev/null; then
        PSYSTEM="APT"
    elif command -v dnf >/dev/null; then
        PSYSTEM="DNF"
    else
        echo "ERROR: Unsupported linux package system"
        exit 1
    fi

    # DETERMINE DISTRO
    UNAME=$(uname | tr "[:upper:]" "[:lower:]")
    # If Linux, try to determine specific distribution
    if [ "$UNAME" == "linux" ]; then
        # If available, use LSB to identify distribution
        if [ -f /etc/os-release ]; then
            export DISTRO=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
            export DISTRO_VERSION=$(grep '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
        fi
    fi

    # MAKE SURE DISTRO IS SUPPORTED
    if [ -z $DISTRO ]; then
        echo "ERROR: Unknown linux distribution"
        exit 1
    elif [ "$DISTRO" != "ubuntu" ] && [ "$DISTRO" != "debian" ] && [ "$DISTRO" != "centos" ]; then
        echo "ERROR: Unsupported linux distribution: ${DISTRO}"
        exit 1
    fi 
}

# Make sure the OS is supported
os_check

# # Make sure kubectl is available
# KUBECTL_OK=$(command_exists kubectl)
# if [ "$KUBECTL_OK" == "KO" ]; then
#     echo "ERROR: You need to install the kubectl CLI first" 
#     exit 1
# fi

# # Install YQ if nnot available
# YQ_OK=$(command_exists yq)
# if [ "$YQ_OK" == "KO" ]; then
#     wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
#     chmod a+x /usr/local/bin/yq
# fi

# # Get current kubectl context
# KUBE_INFO=$(kubectl config view)

# # echo $KUBE_INFO | yq eval 'select(.kind == "Issuer") | .metadata.name'


# echo "$KUBE_INFO" | /usr/local/bin/yq '.current-context'

echo "Done!"