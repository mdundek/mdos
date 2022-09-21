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

k8s_ns_scope_exist() {
    local __resultvar=$1
    ELM_TYPE=$2
    ELM_NAME=$3
    ELM_NS=$4
    # Admin role
    unset CMD_LINE
    while read CMD_LINE ; do 
        K8S_NAME=`echo "$CMD_LINE" | cut -d' ' -f 1`
        if [ "$K8S_NAME" == "mdos-admin-role" ]; then
            ELM_EXISTS=1
        fi
    done < <(kubectl get $ELM_TYPE -n $ELM_NS 2>/dev/null)

    if [ -z $ELM_EXISTS ]; then
        eval $__resultvar=""
    else
        eval $__resultvar="1"
    fi
}

k8s_cluster_scope_exist() {
    local __resultvar=$1
    ELM_TYPE=$2
    ELM_NAME=$3
    # Admin role
    unset CMD_LINE
    while read CMD_LINE ; do 
        K8S_NAME=`echo "$CMD_LINE" | cut -d' ' -f 1`
        if [ "$K8S_NAME" == "mdos-admin-role" ]; then
            ELM_EXISTS=1
        fi
    done < <(kubectl get $ELM_TYPE 2>/dev/null)

    if [ -z $ELM_EXISTS ]; then
        eval $__resultvar=""
    else
        eval $__resultvar="1"
    fi
}

wait_all_ns_pods_healthy() {
    # Wait for all pods to be on
    unset TARGET_IS_RUNNING
    while [ -z $TARGET_IS_RUNNING ]; do
        unset ANY_ERRORS
        while read TARGET_POD_LINE ; do 
            TARGET_POD_STATUS=`echo "$TARGET_POD_LINE" | awk 'END {print $3}'`
            if [ "$TARGET_POD_STATUS" != "STATUS" ] && [ "$TARGET_POD_STATUS" != "Running" ]; then
                ANY_ERRORS=1
            fi
        done < <(kubectl get pod -n $1 2>/dev/null)
        if [ -z $ANY_ERRORS ]; then
            TARGET_IS_RUNNING=1
        else
            sleep 2
        fi
    done
}