#!/bin/bash

source ../lib/helpers.sh
source ../lib/components.sh
if [ -f ./.env ]; then
    source ./.env
fi

# ######################################
# ########## HELPER FUNCTIONS ##########
# ######################################
get_current_branch() {
    echo "$(git rev-parse --abbrev-ref HEAD)"
}

git_pull_rebase() {
    local  __resultvar=$1
    C_FOLDER="$(basename $PWD)"
    GIT_LOGS=$(git pull --rebase  origin $(git rev-parse --abbrev-ref HEAD) > /dev/null 2>&1)
    if [ $? -ne 0 ]; then
        if [ "$2" != "strict" ]; then
            warn "Your Git repo \"$C_FOLDER\" can not be rebased. If you are about to switch branches, those changes will still be available on the new branch."
            yes_no CHECKOUT_ANYWAY "Do you want to prosceed anyway?"
            if [ "$CHECKOUT_ANYWAY" == "no" ]; then
                exit 1
            fi
            eval $__resultvar="true"
        else
            warn "Your Git repo \"$C_FOLDER\" can not be rebased. Please please commit or stash those changes, then try again."
            exit 1
        fi
    fi
}

check_if_git_has_unstaiged_changes() {
    local  __resultvar=$1
    C_FOLDER="$(basename $PWD)"
    GIT_LOGS=$(git status)
    if [[ "$GIT_LOGS" == *"Changes not staged for commit:"* ]]; then
        if [ "$2" != "strict" ]; then
            warn "Your Git repo \"$C_FOLDER\" has commits that are not pushed to remote yet."
            yes_no CHECKOUT_ANYWAY "Do you want to prosceed anyway?"
            if [ "$CHECKOUT_ANYWAY" == "no" ]; then
                exit 1
            fi
            eval $__resultvar="true"
        else
            warn "Your Git repo \"$C_FOLDER\" has uncommitted changes. Please commit & push those changes, then try again."
            exit 1
        fi
    fi
}

check_if_git_has_untracked() {
    local  __resultvar=$1
    C_FOLDER="$(basename $PWD)"
    GIT_LOGS=$(git status)
    if [[ "$GIT_LOGS" == *"Untracked files:"* ]]; then
        if [ "$2" != "strict" ]; then
            warn "Your Git repo \"$C_FOLDER\" has commits that are not pushed to remote yet."
            yes_no CHECKOUT_ANYWAY "Do you want to prosceed anyway?"
            if [ "$CHECKOUT_ANYWAY" == "no" ]; then
                exit 1
            fi
            eval $__resultvar="true"
        else
            warn "Your Git repo \"$C_FOLDER\" has uncommitted changes. Please commit & push those changes, then try again."
            exit 1
        fi
    fi
}

check_if_git_has_staged_to_commit() {
    local  __resultvar=$1
    C_FOLDER="$(basename $PWD)"
    GIT_LOGS=$(git status)
    if [[ "$GIT_LOGS" == *"Changes to be committed:"* ]]; then
        if [ "$2" != "strict" ]; then
            warn "Your Git repo \"$C_FOLDER\" has commits that are not pushed to remote yet."
            yes_no CHECKOUT_ANYWAY "Do you want to prosceed anyway?"
            if [ "$CHECKOUT_ANYWAY" == "no" ]; then
                exit 1
            fi
            eval $__resultvar="true"
        else
            warn "Your Git repo \"$C_FOLDER\" has uncommitted changes. Please commit & push those changes, then try again."
            exit 1
        fi
    fi
}

check_if_git_is_ahead() {
    local  __resultvar=$1
    C_FOLDER="$(basename $PWD)"
    GIT_LOGS=$(git status)
    if [[ "$GIT_LOGS" == *"Your branch is ahead of "* ]]; then
        if [ "$2" != "strict" ]; then
            warn "Your Git repo \"$C_FOLDER\" has commits that are not pushed to remote yet."
            yes_no CHECKOUT_ANYWAY "Do you want to prosceed anyway?"
            if [ "$CHECKOUT_ANYWAY" == "no" ]; then
                exit 1
            fi
            eval $__resultvar="true"
        else
            warn "Your Git repo \"$C_FOLDER\" has uncommitted changes. Please commit & push those changes, then try again."
            exit 1
        fi
    fi
}

check_if_git_is_clean() {
    local  __resultvar=$1
    C_FOLDER="$(basename $PWD)"
    GIT_LOGS=$(git status -s)
    if [ "$GIT_LOGS" != "" ]; then
        if [ "$2" != "strict" ]; then
            warn "Your Git repo \"$C_FOLDER\" is not clean."
            yes_no CHECKOUT_ANYWAY "Do you want to prosceed anyway?"
            if [ "$CHECKOUT_ANYWAY" == "no" ]; then
                exit 1
            fi
            eval $__resultvar="true"
        else
            warn "Your Git repo \"$C_FOLDER\" is not clean. Please commit/push those changes, then try again."
            exit 1
        fi
    fi
}

get_parent_branch() {
    local  __resultvar=$1
    G_PARENT=$(git show-branch \
        | sed "s/].*//" \
        | grep "\*" \
        | grep -v "$(git rev-parse --abbrev-ref HEAD)" \
        | head -n1 \
        | sed "s/^.*\[//")
    eval $__resultvar="$G_PARENT"
}