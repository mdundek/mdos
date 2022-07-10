#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ./lib/components.sh
source ./lib/helpers.sh

if [ -z $DEP_ONLY ]; then
    HAS_ALIAS=$(cat $HOME/.bashrc | grep "alias mdos=")
    if [ "$HAS_ALIAS" == "" ]; then
        echo 'alias mdos="'$(pwd)'/mdos.sh"' >> $HOME/.bashrc
    fi

    if [ ! -f .env ]; then
        touch .env
    fi
    ./01_setup_env.sh

    echo ""
    info "********** MDOS command is now available **********"
    echo ""
    echo "You can access help for each command by using: mdos --help"

    echo ""
    warn "Restart your terminal for the alias to take effect, or execute the command: source ~/.bashrc"
fi