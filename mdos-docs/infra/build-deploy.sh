#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

cd mkdocs
mkdocs build

rm -rf ../../../docs && mkdir ../../../docs
cp -r ./site/* ../../../docs

cd ../../..

git add .
git commit -m "New documentation build"
git push