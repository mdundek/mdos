#!/bin/bash

CDIR=$1

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source .env

source ./lib/components.sh
source ./lib/helpers.sh

shift
while [ "$1" != "" ]; do
    case $1 in
        --target|-t )
            shift
            P_TARGET=$1
        ;; 
        * ) C_COMMAND="$C_COMMAND $1"
    esac
    shift
done

echo ""

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
        echo ""
    }

    trap _catch ERR
    trap _finally EXIT
  
    # ############### EXECUTE ################

    POD_CANDIDATES=()
    NS_CANDIDATES=()
    while read DEPLOYMENT_LINE ; do 
        POD_NAME=`echo "$DEPLOYMENT_LINE" | awk 'END {print $2}'`
        NS_NAME=`echo "$DEPLOYMENT_LINE" | awk 'END {print $1}'`
        if [[ "$POD_NAME" == *"$P_TARGET"* ]]; then
           POD_CANDIDATES+=($POD_NAME)
           NS_CANDIDATES+=($NS_NAME)
        fi
    done < <(kubectl get pod -A 2>/dev/null)

    if [ ${#POD_CANDIDATES[@]} -eq 0 ]; then
        echo "Could not find any candidates for this pod name"
        exit 1
    else
        info "Execute command on POD: ${POD_CANDIDATES[0]}, NAMESPACE: ${NS_CANDIDATES[0]}"
        k3s kubectl exec --stdin --tty ${POD_CANDIDATES[0]} -n ${NS_CANDIDATES[0]} -- $C_COMMAND
    fi
)