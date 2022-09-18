#!/bin/bash

set -e

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
else
    TAR_ARGS="xz"
fi
echo $TAR_ARGS
# echo "Installing CLI from"
