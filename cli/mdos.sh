#!/bin/bash

CDIR=$(pwd)

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ./lib/helpers.sh

if [ -z $1 ] || [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    ./mdos_help.sh
    exit
fi

case $1 in
    generate )
        shift
        if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
            cat ./man/generate.man
            exit 0
        fi
        ./mdos_generate.sh "$CDIR" $@
    ;;
    build )
        shift
        if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
            cat ./man/build.man
            exit 0
        fi
        ./mdos_build.sh "$CDIR" $@
    ;;    
    deploy )
        shift
        if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
            cat ./man/deploy.man
            exit 0
        fi
        ./mdos_deploy.sh "$CDIR" $@
    ;; 
    core-setup )
        shift
        if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
            cat ./man/core-setup.man
            exit 0
        fi
        ./mdos_core_setup.sh "$CDIR" $@
    ;;    
    help )
        shift
        ./mdos_help.sh
    ;;
    * ) error "Unknown command: $1"
        echo "Tu see the list of all available commands, do: mdos help"
        exit 1
esac