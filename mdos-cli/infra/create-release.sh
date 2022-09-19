#!/bin/bash
_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ./lib/helpers.sh
source ./lib/components.sh
source ./.env

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


# ######################################
# ############### MAIN #################
# ######################################

(
    set -Ee

    # ################################################
    # ############ TRY CATCH INTERCEPTORS ############
    # ################################################

    function _catch {
        # Rollback
        error "$(caller): ${BASH_COMMAND}"
    }

    function _finally {
        info "Done!"
    }

    trap '_catch' ERR
    trap _finally EXIT
    
    # ############### MAIN #################

    cd $_DIR & cd ../..
    REPO_DIR=$(pwd)
    REPO_BRANCH_MDOS=$(get_current_branch)

    GH_OK=$(command_exists gh)
    if [ "$GH_OK" == "KO" ]; then
      error "You need to install the gh (GitHub) CLI first" 
      exit 1
    fi

    # Check git status
    check_if_git_has_unstaiged_changes UNSTAGED_CHANGES "strict"
    PROSCEED_IF_DIRTY=""
    if [ "$REPO_BRANCH_MDOS" == "main" ]; then
        check_if_git_is_clean PROSCEED_IF_DIRTY strict
    else
        check_if_git_is_clean PROSCEED_IF_DIRTY
        git checkout main > /dev/null 2>&1
    fi
    git_pull_rebase PROSCEED_IF_DIRTY strict

    git rev-parse --verify release > /dev/null 2>&1
    if [ $? != 0 ]; then
        git checkout -b release > /dev/null 2>&1
        git push -u origin release > /dev/null 2>&1
    else
        git checkout release > /dev/null 2>&1
        git_pull_rebase PROSCEED_IF_DIRTY strict
    fi

    git checkout main > /dev/null 2>&1

    # Determine new version
    question "What version upgrade type do you want to do for those repos?"
    OPTIONS_VALUES=("major" "feature" "bug")
    OPTIONS_LABELS=("X.y.z" "x.Y.z" "x.y.Z")
    OPTIONS_STRING=""
    for y in "${!OPTIONS_VALUES[@]}"; do
        OPTIONS_STRING+="${OPTIONS_VALUES[$y]} (${OPTIONS_LABELS[$y]});"
    done
    prompt_for_select VERSION_BUMP_FLAGS "$OPTIONS_STRING"
    for y in "${!VERSION_BUMP_FLAGS[@]}"; do
        if [ "${VERSION_BUMP_FLAGS[$y]}" == "true" ]; then
            VERSION_BUMP_TARGET="${OPTIONS_VALUES[$y]}"
        fi
    done

    # Update version and merge with release branch
    process_repo_release() {
        bump_and_merge() {
            (
                ./mdos-cli/infra/version-bump.sh --type $1 && \
                git checkout release > /dev/null 2>&1 && \
                git merge --no-ff main > /dev/null 2>&1
                git push origin release > /dev/null 2>&1
            ) || ( exit 1 )
        }
        return_to_branch() {
            git checkout $REPO_BRANCH_MDOS > /dev/null 2>&1
        }
        on_error() {
            error "$1. You should manually clean up and fix potential inconcistencies."
            return_to_branch
            exit 1
        }
        info "Bump up version & merge to branch \"release\"..."
        bump_and_merge $VERSION_BUMP_TARGET || on_error "Could not create release for repo ${c_warn}$REPO_DIR${c_reset}"
        
        return_to_branch

        info "Successfully merged repo ${c_warn}$REPO_DIR${c_reset} to release branch on version ${c_warn}$CURRENT_APP_VERSION${c_reset}"
    }

    info "Processing Repo..."
    process_repo_release $_PATH $_CHART_PATH

    # Create new tag for version and publish to release
    git checkout release > /dev/null 2>&1

    process_repo_tag_publish() {
        tag() {
            (
                git tag -a v$1 -m "Release version v$1" > /dev/null 2>&1 && \
                git push origin --tags > /dev/null 2>&1
            ) || ( exit 1 )
        }
        return_to_branch() {
            git checkout $REPO_BRANCH_MDOS > /dev/null 2>&1
        }
        on_error() {
            error "$1. You should manually clean up and fix potential inconcistencies."
            return_to_branch
            exit 1
        }
    
        CURRENT_APP_VERSION=$(cat ./mdos-cli/package.json | grep '"version":' | head -1 | cut -d ":" -f2 | cut -d'"' -f 2)
        
        info "Tagging current commit with version $CURRENT_APP_VERSION..."
        tag $CURRENT_APP_VERSION || on_error "Could not tag commit for repo ${c_warn}$REPO_DIR${c_reset}"

        return_to_branch

        info "Successfully tagged repo ${c_warn}$REPO_DIR${c_reset} on release branch: version ${c_warn}$CURRENT_APP_VERSION${c_reset}"
    }

    process_repo_tag_publish

    # Now we create the release for this tag
    # Create release with releasenotes
    generate_release_files() {
        # Package files
        cd ./mdos-cli
        npm run package

        # Rename files
        cd ./dist
        for f in ./*.tar.*; do
            if [[ $f == *"darwin-arm64.tar.gz"* ]]; then
                AUID=$f
                AUID=${AUID##*mdos-v1.0.13-}
                AUID=${AUID%%-darwin-arm64.tar.gz*}
            fi
        done
        if [ ! -z $AUID ]; then
            for f in ./*.tar.*; do
                mv $f ${f/-$AUID/}   
            done
        fi
        cd ../..
    }

    git_release() {
        TAG_NAME="$1"

        # Login to Github using gh CLI
        echo "$GITHUB_TOKEN" > .githubtoken
        gh auth login --hostname github.com --git-protocol https --with-token < .githubtoken
        rm -rf .githubtoken

        # Create release
        gh release create --generate-notes --target release $TAG_NAME ./mdos-cli/dist/*.tar.*
    }

    if [ -z $GITHUB_TOKEN ]; then
        user_input GITHUB_TOKEN "Please enter your Github API token:"
        echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> $_DIR/.env
    fi

    # Generate assets
    generate_release_files
    RELEASE_URL=$(git_release $CURRENT_APP_VERSION)

    # Clean up
    rm -rf ./mdos-cli/dist/*.tar.*

    info "Release created for tag $CURRENT_APP_VERSION: $RELEASE_URL"
)








