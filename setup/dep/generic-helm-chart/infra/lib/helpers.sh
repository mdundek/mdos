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

replace_all() {
    sed -i "s|$1|$2|g" $3
}

command_exists() {
    {
        command -v $1
        if [ $? -eq 0 ]; then
            echo "OK"
        else
            echo "KO"
        fi
    } || {
        echo "KO"
    }
}

question() {
    echo "${c_cyan}$1${c_reset}"
}

info() {
    echo "${c_info}INFO${c_reset}: $1"
}

error() {
    echo "${c_error}ERROR${c_reset}: $1"
}

warn() {
    echo "${c_warn}WARN${c_reset}: $1"
}

replace_chart_dep_version() {
    SOURCE_FILE=$1
    DEP_NAME=$2
    VERSION=$3
    unset FOUND_DEP
    rm -rf $SOURCE_FILE.tmp
    while IFS= read -r LINE; do
        if [[ "$LINE" == "- name: $DEP_NAME" ]]; then
            FOUND_DEP=1
            echo "$LINE" >> $SOURCE_FILE.tmp
        elif [[ ! -z $FOUND_DEP ]] && [[ "$LINE" == *"version: "* ]]; then
            echo "  version: \"$VERSION\"" >> $SOURCE_FILE.tmp
            unset FOUND_DEP
        else
            echo "$LINE" >> $SOURCE_FILE.tmp
        fi
    done < "$SOURCE_FILE"
    rm -rf $SOURCE_FILE
    mv $SOURCE_FILE.tmp $SOURCE_FILE
}

replace_chart_version() {
    SOURCE_FILE=$1
    VERSION=$2
    unset FOUND_V
    unset FOUND_AV
    rm -rf $SOURCE_FILE.tmp
    while IFS= read -r LINE; do
        if [ -z $FOUND_V ] && [[ "$LINE" == "version: "* ]]; then
            FOUND_V=1
            echo "version: $VERSION" >> $SOURCE_FILE.tmp
        elif [ -z $FOUND_AV ] && [[ "$LINE" == "appVersion: "* ]]; then
            FOUND_AV=1
            echo "appVersion: \"$VERSION\"" >> $SOURCE_FILE.tmp
        else
            echo "$LINE" >> $SOURCE_FILE.tmp
        fi
    done < "$SOURCE_FILE"
    rm -rf $SOURCE_FILE
    mv $SOURCE_FILE.tmp $SOURCE_FILE
}