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
echo "
  __  __ ___   ___  ___   ___ ___ __  __  _____   _____  __      _____  ___ _  _____ ___ 
 |  \/  |   \ / _ \/ __| | _ \ __|  \/  |/ _ \ \ / / __|_\ \    / / _ \| _ \ |/ / __| _ \
 | |\/| | |) | (_) \__ \ |   / _|| |\/| | (_) \ V /| _|___\ \/\/ / (_) |   / ' <| _||   /
 |_|  |_|___/ \___/|___/ |_|_\___|_|  |_|\___/ \_/ |___|   \_/\_/ \___/|_|_\_|\_\___|_|_\
                                                                                                                                         
"     

# Os checks
os_check

# Resource check
resources_check 500 1.5GB

LOG_FILE="$HOME/$(date +'%m_%d_%Y_%H_%M_%S')_mdos_install.log"

# PARSE USER INPUT
while [ "$1" != "" ]; do
    case $1 in
        --node-name )
            shift
            NODE_NAME=$1
        ;;
        * ) error "Invalid parameter detected: $1"
            exit 1
    esac
    shift
done

# Set up firewall
init_firewall

# ############################################
# ############# COLLECT USER DATA ############
# ############################################
collect_user_input() {
    if [ -z $NODE_NAME ]; then
        echo ""
        user_input NODE_NAME "Enter worker node name you wish to remove:"
    fi
}

# ############################################
# ############## REMOVE WORKER ###############
# ############################################
remove_worker() {
    kubectl drain $NODE_NAME --ignore-daemonsets --delete-local-data &>> $LOG_FILE
    kubectl delete node $NODE_NAME &>> $LOG_FILE
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
        if [ -z $GLOBAL_ERROR ]; then
            info "Done!"
        fi
    }

    trap _catch ERR
    trap _finally EXIT

    # ############### MAIN ################
    
    # COLLECT USER DATA
    collect_user_input

    info "Removing worker node..."
    remove_worker
)