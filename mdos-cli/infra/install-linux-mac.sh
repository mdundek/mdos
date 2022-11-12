#!/bin/bash

{
    set -e

    echo "This will install the MDOS CLI onto this machine."

    if [ "$EUID" -ne 0 ]; then
      echo "This script requires superuser access."
      echo "Please run it as root or using sudo."
      exit 1
    fi

    if [ ! -z $1 ]; then
        CLI_VERSION=$1
    else
        CLI_VERSION=v1.4.0
    fi

    if [[ ! ":$PATH:" == *":/usr/local/bin:"* ]]; then
        echo "Your path is missing /usr/local/bin, you need to add this to use this installer."
        exit 1
    fi

    if [ "$(uname)" == "Darwin" ]; then
        OS=darwin
    elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
        OS=linux
    else
        echo "This installer is only supported on Linux and MacOS"
        exit 1
    fi

    ARCH="$(uname -m)"
    if [ "$ARCH" == "x86_64" ]; then
        ARCH=x64
    else
        echo "unsupported arch: $ARCH"
        exit 1
    fi

    mkdir -p /usr/local/lib
    cd /usr/local/lib
    rm -rf mdos
    rm -rf ~/.mdos/cli.json
    if [ $(command -v xz) ]; then
        TAR_ARGS="xJ"
        URL=https://github.com/mdundek/mdos/releases/download/$CLI_VERSION/mdos-$CLI_VERSION-$OS-$ARCH.tar.xz
    else
        TAR_ARGS="xz"
        URL=https://github.com/mdundek/mdos/releases/download/$CLI_VERSION/mdos-$CLI_VERSION-$OS-$ARCH.tar.gz
    fi

    echo "Installing CLI from $URL"
    if [ $(command -v wget) ]; then
        wget -O- "$URL" | tar "$TAR_ARGS"
    else
        echo "wget is required to install this package"
        exit 1
    fi
    # delete old mdos bin if exists
    rm -f $(command -v mdos) || true
    rm -f /usr/local/bin/mdos
    ln -s /usr/local/lib/mdos/bin/mdos /usr/local/bin/mdos

    # on alpine (and maybe others) the basic node binary does not work
    # remove our node binary and fall back to whatever node is on the PATH
    /usr/local/lib/mdos/bin/node -v || rm /usr/local/lib/mdos/bin/node

    # test the CLI
    LOCATION=$(command -v mdos)
    echo "mdos installed to $LOCATION"
}