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
source ./lib/mdos_lib.sh

clear
echo '
  __  __ ___   ___  ___   ___ _  _ ___ _____ _   _    _    
 |  \/  |   \ / _ \/ __| |_ _| \| / __|_   _/_\ | |  | |   
 | |\/| | |) | (_) \__ \  | || .` \__ \ | |/ _ \| |__| |__ 
 |_|  |_|___/ \___/|___/ |___|_|\_|___/ |_/_/ \_\____|____|
                                                           
'     

# Os checks
os_check

LOG_FILE="$HOME/$(date +'%m_%d_%Y_%H_%M_%S')_mdos_install.log"

# PARSE USER INPUT
while [ "$1" != "" ]; do
    case $1 in
        --reset )
            rm -rf $HOME/.mdos
        ;;
        * ) error "Invalid parameter detected: $1"
            exit 1
    esac
    shift
done

# Set up firewall
setup_firewall

# ############################################
# ############# COLLECT USER DATA ############
# ############################################
collect_user_input() {
    unset LOOP_BREAK
    while [ -z $LOOP_BREAK ]; do
        user_input MASTER_IP "MDos K3S master node host IP address:"
        if [[ $MASTER_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            if ping -c1 -w2 $MASTER_IP >/dev/null 2>&1; then
                LOOP_BREAK=1
            else
                error "IP address $MASTER_IP is not reachable"
            fi
        else
            error "Invalid IP address"
        fi
    done

    context_print "To allow this worker node to join the MDos K3S Cluster, a \"Node-token\" is required."
    context_print "You can find this token on the Master node by executing the command:"
    note_print "sudo cat /var/lib/rancher/k3s/server/node-token"
    echo ""

    user_input K3S_CLUSTER_TOKEN "K3S Master node-token:"
}

# ############################################
# ################# FIREWALL #################
# ############################################
setup_worker_firewall() {
    # Enable firewall ports if necessary for NGinx port forwarding proxy to istio HTTPS ingress gateway
    if [ "$USE_FIREWALL" == "yes" ]; then
        if command -v ufw >/dev/null; then
            info "Setting up firewall rules..."
            if [ "$(ufw status | grep 'HTTPS\|443' | grep 'ALLOW')" == "" ]; then
                ufw allow 443 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep 'HTTPS\|6443' | grep 'ALLOW')" == "" ]; then
                ufw allow 6443 &>> $LOG_FILE
            fi
            if [ "$(ufw status | grep 'HTTPS\|30999' | grep 'ALLOW')" == "" ]; then
                ufw allow 30999 &>> $LOG_FILE
            fi
        fi
    fi
}

# ############################################
# ############### INSTALL K3S ################
# ############################################
install_k3s_worker() {
    curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_IP:6443 K3S_TOKEN="$K3S_CLUSTER_TOKEN" sh - &>> $LOG_FILE

    systemctl enable --now k3s-agent &>> $LOG_FILE
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
        echo "=> ERROR OCCURED" &>> $LOG_FILE
        
    }

    function _finally {
        # Cleanup
        info "Cleaning up..."
       
        set +Ee
        
        note_print "Log details of the installation can be found here: $LOG_FILE"

        if [ -z $GLOBAL_ERROR ]; then
            info "Done!"
        fi
    }

    trap _catch ERR
    trap _finally EXIT

    # ############### MAIN ################
    info "Update system and install dependencies..."
    dependencies
   
    # COLLECT USER DATA
    collect_user_input

    # INSTALL K3S
    info "Installing K3S worker node..."
    install_k3s_worker

    # SETUP FIREWALL
    setup_worker_firewall
)