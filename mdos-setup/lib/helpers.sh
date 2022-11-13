#!/bin/bash

c_info=""
c_note=""
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
        c_note=$(tput setaf 6)
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

distro() {
    # Determine OS platform
    UNAME=$(uname | tr "[:upper:]" "[:lower:]")
    # If Linux, try to determine specific distribution
    if [ "$UNAME" == "linux" ]; then
        # If available, use LSB to identify distribution
        if [ -f /etc/lsb-release -o -d /etc/lsb-release.d ]; then
            export DISTRO=$(lsb_release -i | cut -d: -f2 | sed s/'^\t'// | tr '[:upper:]' '[:lower:]')
        # Otherwise, use release info file
        else
            export DISTRO=$(ls -d /etc/[A-Za-z]*[_-][rv]e[lr]* | grep -v "lsb" | cut -d'/' -f3 | cut -d'-' -f1 | cut -d'_' -f1 | tr '[:upper:]' '[:lower:]')
            if [[ $DISTRO == *"redhat"* ]]; then
                DISTRO="redhat"
            elif [[ $DISTRO == *"centos"* ]]; then
                DISTRO="centos"
            fi
        fi
    fi
    # For everything else (or if above failed), just use generic identifier
    [ "$DISTRO" == "" ] && export DISTRO=$UNAME
}

question() {
    echo "${c_cyan}$1${c_reset}"
}

info() {
    echo "${c_info}INFO${c_reset}: $1"
}

note() {
    echo "${c_note}NOTE${c_reset}: $1"
}

error() {
    echo "${c_error}ERROR${c_reset}: $1"
}

warn() {
    echo "${c_warn}WARN${c_reset}: $1"
}

info_print() {
    echo "${c_info}$1${c_reset}"
}

note_print() {
    echo "${c_note}$1${c_reset}"
}

context_print() {
    echo "${c_grey}$1${c_reset}"
}

print_section_title() {
    echo ""
    warn_print "$1"
    warn_print "-------------------------------------"
}

error_print() {
    echo "${c_error}$1${c_reset}"
}

warn_print() {
    echo "${c_warn}$1${c_reset}"
}

get_full_path() {
    local __resultvar=$1
    _CPWD=$(pwd)
    if [[ -d $2 ]]; then
        cd $2
        eval $__resultvar="$(pwd)"
    elif [[ -f $2 ]]; then
        __BASEDIR=$(dirname "$2")
        __BASENAME=$(basename "$2")
        cd $__BASEDIR
        eval $__resultvar="$(pwd)/$__BASENAME"
    else
        error "$2 is not valid. Current path is: $_CPWD"
        exit 1
    fi
    cd $_CPWD
}