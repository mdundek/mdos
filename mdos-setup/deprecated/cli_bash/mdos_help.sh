#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ./lib/helpers.sh
source ./lib/components.sh

select_command() {
    local  __resultvar=$1
    OPTIONS_STRING=()
    OPTIONS_VALUES=()
    commands=( $(find ./man/*) )
    for i in "${!commands[@]}"; do
      CMD_NAME=$(basename -- ${commands[$i]} .man)
      OPTIONS_STRING+="$CMD_NAME;"
      OPTIONS_VALUES+=($CMD_NAME)
    done
    prompt_for_select CMD_SELECT "$OPTIONS_STRING"
   
    for i in "${!CMD_SELECT[@]}"; do
        if [ "${CMD_SELECT[$i]}" == "true" ]; then
            eval $__resultvar="'${OPTIONS_VALUES[$i]}'"
        fi
    done
}

question "Select command to get help for:"
select_command SEL_COMMAND

cat ./man/$SEL_COMMAND.man