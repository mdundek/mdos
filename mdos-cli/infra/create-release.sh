#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR
cd ../..

if [ -z $1 ]; then
    echo "Missing tag name"
fi

git tag $1
git push origin --tags