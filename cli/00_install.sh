#!/bin/bash

c_info=""
c_error=""
c_warn=""
c_reset=""
c_bold=""
c_cyan=""
c_white=""
c_grey=""

if [ ! -z $TERM ] && [ "$TERM" != "dumb" ]; then
    command -v tput &> /dev/null || NO_TPUT=1
    if [ -z $NO_TPUT ]; then
        c_info=$(tput setaf 2)
        c_error=$(tput setaf 160)
        c_warn=$(tput setaf 214)
        c_reset=$(tput sgr0)
        c_bold=$(tput bold)
        c_cyan=$(tput setaf 6)
        c_white=$(tput setaf 7)
        c_grey=$(tput setaf 243)
    fi
fi

mkdir -p $HOME/.mdos
cd $HOME/.mdos

git clone https://github.com/mdundek/mdundek.network.git

sudo ./mdundek.network/cli/01_setup_mdos_cmd.sh --platform-user $USER



