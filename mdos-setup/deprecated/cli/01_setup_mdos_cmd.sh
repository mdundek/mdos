#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ../lib/components.sh
source ../lib/helpers.sh

echo "
  __  __ ___   ___  ___      ___ _    ___ 
 |  \/  |   \ / _ \/ __|___ / __| |  |_ _|
 | |\/| | |) | (_) \__ \___| (__| |__ | | 
 |_|  |_|___/ \___/|___/    \___|____|___|

"                                          

# Docker
sudo ../dep/81_install_docker.sh --platform-user $USER

HAS_ALIAS=$(cat $HOME/.bashrc | grep "alias mdos=")
if [ "$HAS_ALIAS" == "" ]; then
    echo 'alias mdos="'$(dirname "$(pwd)")'/mdos.sh"' >> $HOME/.bashrc
fi

if [ ! -f ../../cli/.env ]; then
    touch ../../cli/.env
fi
./02_setup_env.sh

echo ""
info "********** MDOS command is now available **********"
echo ""
echo "You can access help for each command by using: mdos --help"

echo ""
warn "Restart your terminal for the alias to take effect, or execute the command: source ~/.bashrc"