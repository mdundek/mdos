#!/bin/bash

CDIR=$1

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ./lib/components.sh
source ./lib/helpers.sh

select_command() {
    set +Ee
    local  __resultvar=$1
    OPTIONS_STRING=()
    OPTIONS_VALUES=()
    commands=( $(find ../scripts/0*.sh) )
    for i in "${!commands[@]}"; do
      CMD_NAME=$(basename -- ${commands[$i]} .sh)
      OPTIONS_STRING+="$CMD_NAME;"
      OPTIONS_VALUES+=($CMD_NAME)
    done
    prompt_for_select CMD_SELECT "$OPTIONS_STRING"
   
    for i in "${!CMD_SELECT[@]}"; do
        if [ "${CMD_SELECT[$i]}" == "true" ]; then
            eval $__resultvar="'${OPTIONS_VALUES[$i]}'"
        fi
    done
    set -Ee
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
        echo ""
    }

    trap _catch ERR
    trap _finally EXIT
  
    # ############### EXECUTE ################

    question "Select installation step:"
    select_command SEL_COMMAND

    sudo ../scripts/$SEL_COMMAND.sh
)