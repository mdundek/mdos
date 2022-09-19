#!/bin/bash
_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ./lib/helpers.sh
source ./lib/components.sh

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
# ############### RELEASE ##############
# ######################################
release_from_main() {
    echo ""
    # select_repos SEL_REPOS --mandatory --include-stack-chart

    # # First, we make sure all target repos have no un-committed stuff as a pre-flight check
    # info "Repo pre-flight checks..."
    
    # # Get target repo absolute path
    # cd $_DIR & cd ..
    
    # REPO_BRANCH_MDOS=$(get_current_branch)
    # REPO_DIR=$(pwd)

    # PROSCEED_IF_DIRTY=""
    # if [ "$REPO_BRANCH_MDOS" == "main" ]; then
    #     check_if_git_is_clean PROSCEED_IF_DIRTY strict
    # else
    #     check_if_git_is_clean PROSCEED_IF_DIRTY
    #     git checkout main > /dev/null 2>&1
    # fi
    # git_pull_rebase PROSCEED_IF_DIRTY strict

    # git rev-parse --verify release > /dev/null 2>&1
    # if [ $? != 0 ]; then
    #     git checkout -b release > /dev/null 2>&1
    #     git push -u origin release > /dev/null 2>&1
    # else
    #     git checkout release > /dev/null 2>&1
    #     git_pull_rebase PROSCEED_IF_DIRTY strict
    # fi

    # git checkout main > /dev/null 2>&1
   
    # # Version bump target
    # question "What version upgrade type do you want to do for those repos?"
    # OPTIONS_VALUES=("major" "feature" "bug")
    # OPTIONS_LABELS=("X.y.z" "x.Y.z" "x.y.Z")
    # OPTIONS_STRING=""
    # for y in "${!OPTIONS_VALUES[@]}"; do
    #     OPTIONS_STRING+="${OPTIONS_VALUES[$y]} (${OPTIONS_LABELS[$y]});"
    # done
    # prompt_for_select VERSION_BUMP_FLAGS "$OPTIONS_STRING"
    # for y in "${!VERSION_BUMP_FLAGS[@]}"; do
    #     if [ "${VERSION_BUMP_FLAGS[$y]}" == "true" ]; then
    #         VERSION_BUMP_TARGET="${OPTIONS_VALUES[$y]}"
    #     fi
    # done

    # # Now create release merges
    # process_repo_release() {
        
    #     C_PWD=$(pwd)
    #     REPO_DIR=$(basename $C_PWD)
        
    #     # Version bump
    #     bump_and_merge() {
    #         (
    #             ./infra/version_bump.sh --type $1 && \
    #             git checkout release > /dev/null 2>&1 && \
    #             git merge --no-ff main > /dev/null 2>&1
    #             git push origin release > /dev/null 2>&1
    #         ) || ( exit 1 )
    #     }
    #     return_to_branch() {
    #         git checkout $REPO_BRANCH_MDOS > /dev/null 2>&1
    #     }
    #     on_error() {
    #         error "$1. You should manually clean up and fix potential inconcistencies."
    #         return_to_branch
    #         exit 1
    #     }
    #     info "Bump up version & merge to branch \"release\"..."
    #     bump_and_merge $VERSION_BUMP_TARGET || on_error "Could not create release for repo ${c_warn}$REPO_DIR${c_reset}"
        
    #     return_to_branch

    #     info "Successfully merged repo ${c_warn}$REPO_DIR${c_reset} to release branch on version ${c_warn}$CURRENT_APP_VERSION${c_reset}"
    # }

    # info "Processing Repo..."
    # process_repo_release $_PATH $_CHART_PATH
}

# ######################################
# ########### TAG & PUBLISH ############
# ######################################
tag_publish() {
    echo ""
    # # First, we make sure all target repos have no un-committed stuff as a pre-flight check
    # info "Repo pre-flight checks..."
    # for i in "${!SEL_REPOS[@]}"; do
    #     # Get target repo absolute path
    #     cd $_DIR
    #     case ${SEL_REPOS[$i]} in
    #         okube) 
    #             _PATH=../../scds-bf74-okube-api
    #             cd $_PATH && REPO_BRANCH_MDOS=$(get_current_branch) && cd $_DIR
    #         ;;
    #         ms) 
    #             _PATH=../../scds-bf74-osp-ms-jobs
    #             cd $_PATH && REPO_BRANCH_MS=$(get_current_branch) && cd $_DIR
    #         ;;
    #         broker-client) 
    #             _PATH=../../scds-bf74-broker-client
    #             cd $_PATH && REPO_BRANCH_BROKER_CLIENT=$(get_current_branch) && cd $_DIR
    #         ;;
    #         osp-logger) 
    #             _PATH=../../scds-bf74-npm-logger
    #             cd $_PATH && REPO_BRANCH_OSP_LOGGER=$(get_current_branch) && cd $_DIR
    #         ;;
    #         helm-chart) 
    #             _PATH=../../scds-bf74-generic-helm-chart-stateless
    #             cd $_PATH && REPO_BRANCH_GEN_HELM=$(get_current_branch) && cd $_DIR
    #         ;;
    #         cc) 
    #             _PATH=../../scds-bf74-osp-control-center
    #             cd $_PATH && REPO_BRANCH_CC=$(get_current_branch) && cd $_DIR
    #         ;;
    #         stack) 
    #             _PATH=../
    #             cd $_PATH && REPO_BRANCH_STACK=$(get_current_branch) && cd $_DIR
    #         ;;
    #     esac
        
    #     if [ ! -d "$_PATH" ]; then
    #         error "Git repo for project \"${SEL_REPOS[$i]}\" does not exist. Clone it next to the repo \"scds-bf74-scds-stack-helm-chart\" and try again."
    #         exit 1
    #     fi
    #     cd $_PATH

    #     git rev-parse --verify release > /dev/null 2>&1
    #     if [ $? != 0 ]; then
    #         error "There is no release branch for this repo."
    #         exit 1
    #     fi

    #     C_PWD=$(pwd)
    #     REPO_DIR=$(basename $C_PWD)
    #     case ${SEL_REPOS[$i]} in
    #         okube) _CHART_PATH=./infra/helm/scds-osp-okube-api/Chart.yaml;;
    #         ms) _CHART_PATH=./infra/helm/scds-osp-ms-deploy/Chart.yaml;;
    #         broker-client) _CHART_PATH=./package.json;;
    #         osp-logger) _CHART_PATH=./package.json;;
    #         helm-chart) _CHART_PATH=./Chart.yaml;;
    #         cc) _CHART_PATH=./infra/helm/scds-osp-cc/Chart.yaml;;
    #         stack) get_full_path _CHART_PATH ./chart/Chart.yaml;;
    #     esac
      
    #     if [ "$REPO_DIR" == "scds-bf74-broker-client" ] || [ "$REPO_DIR" == "scds-bf74-npm-logger" ]; then
    #         CURRENT_APP_VERSION=$(cat $_CHART_PATH | grep "\"version\":" | cut -d ":" -f2 | cut -d'"' -f 2)
    #     else
    #         CURRENT_APP_VERSION=$(cat $_CHART_PATH | grep 'version:' | head -1 | cut -d ":" -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    #     fi

    #     GIT_TAG_EXISTS=$(git tag -l "v$CURRENT_APP_VERSION")
    #     if [ ! -z $GIT_TAG_EXISTS ]; then
    #         error "The tag \"v$CURRENT_APP_VERSION\" already exists for repo \"$REPO_DIR\"."
    #         exit 1
    #     fi

    #     REPO_BRANCH=$(get_current_branch)
    #     PROSCEED_IF_DIRTY=""
    #     if [ "$REPO_BRANCH" == "main" ]; then
    #         check_if_git_is_clean PROSCEED_IF_DIRTY strict
    #     else
    #         check_if_git_is_clean PROSCEED_IF_DIRTY
    #         git checkout main > /dev/null 2>&1
    #     fi

    #     git_pull_rebase PROSCEED_IF_DIRTY strict

    #     git checkout release > /dev/null 2>&1
    # done








    # # Now create tag & publish
    # process_repo_tag_publish() {
    #     cd $1

    #     C_PWD=$(pwd)
    #     REPO_DIR=$(basename $C_PWD)
        
    #     tag() {
    #         (
    #             git tag -a v$1 -m "Release version v$1" > /dev/null 2>&1 && \
    #             git push origin --tags > /dev/null 2>&1
    #         ) || ( exit 1 )
    #     }
    #     return_to_branch() {
    #         if [ "$REPO_DIR" == "scds-bf74-okube-api" ]; then
    #             git checkout $REPO_BRANCH_MDOS > /dev/null 2>&1
    #         elif [ "$REPO_DIR" == "scds-bf74-osp-ms-jobs" ]; then
    #             git checkout $REPO_BRANCH_MS > /dev/null 2>&1
    #         elif [ "$REPO_DIR" == "scds-bf74-broker-client" ]; then
    #             git checkout $REPO_BRANCH_BROKER_CLIENT > /dev/null 2>&1
    #         elif [ "$REPO_DIR" == "scds-bf74-npm-logger" ]; then
    #             git checkout $REPO_BRANCH_OSP_LOGGER > /dev/null 2>&1
    #         elif [ "$REPO_DIR" == "scds-bf74-generic-helm-chart-stateless" ]; then
    #             git checkout $REPO_BRANCH_GEN_HELM > /dev/null 2>&1
    #         elif [ "$REPO_DIR" == "scds-bf74-osp-control-center" ]; then
    #             git checkout $REPO_BRANCH_CC > /dev/null 2>&1
    #         elif [ "$REPO_DIR" == "scds-bf74-scds-stack-helm-chart" ]; then
    #             git checkout $REPO_BRANCH_STACK > /dev/null 2>&1
    #         fi
    #     }
    #     on_error() {
    #         error "$1. You should manually clean up and fix potential inconcistencies."
    #         return_to_branch
    #         exit 1
    #     }
    
    #     if [ "$REPO_DIR" == "scds-bf74-broker-client" ] || [ "$REPO_DIR" == "scds-bf74-npm-logger" ]; then
    #         CURRENT_APP_VERSION=$(cat $2 | grep "\"version\":" | cut -d ":" -f2 | cut -d'"' -f 2)
    #     else
    #         CURRENT_APP_VERSION=$(cat $2 | grep 'version:' | head -1 | cut -d ":" -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    #     fi
        
    #     info "Tagging current commit with version $CURRENT_APP_VERSION..."
    #     tag $CURRENT_APP_VERSION || on_error "Could not tag commit for repo ${c_warn}$REPO_DIR${c_reset}"

    #     return_to_branch

    #     info "Successfully tagged repo ${c_warn}$REPO_DIR${c_reset} on release branch: version ${c_warn}$CURRENT_APP_VERSION${c_reset}"
    # }






    # # Get previous tag name for repo
    # get_previous_tag() {
    #     local __resultvar=$1
    #     readarray -t LAST_TWO_TAGS < <( git tag | sort -V | tail -2 )
    #     if [ "${#LAST_TWO_TAGS[@]}" -eq "2" ]; then
    #         eval $__resultvar='${LAST_TWO_TAGS[0]}'
    #     else   
    #         eval $__resultvar=''
    #     fi
    # }

    # # Create release with releasenotes
    # git_release() {
    #     TAG_NAME="$1"

    #     # Login to Github using gh CLI
    #     echo "$GITHUB_TOKEN" > .githubtoken
    #     gh auth login --hostname github.airbus.corp --git-protocol https --with-token < .githubtoken
    #     rm -rf .githubtoken

    #     # Create release
    #     gh release create $TAG_NAME -F ./changelogs/$TAG_NAME.md
    # }

    # # First all but stack
    # for i in "${!SEL_REPOS[@]}"; do
    #     # Get target repo absolute path
    #     cd $_DIR
    #     TARGET_REPO_KEY=${SEL_REPOS[$i]}
    #     unset _PATH
    #     case $TARGET_REPO_KEY in
    #         okube) _PATH=../../scds-bf74-okube-api;;
    #         ms) _PATH=../../scds-bf74-osp-ms-jobs;;
    #         broker-client) _PATH=../../scds-bf74-broker-client;;
    #         osp-logger) _PATH=../../scds-bf74-npm-logger;;
    #         helm-chart) _PATH=../../scds-bf74-generic-helm-chart-stateless;;
    #         cc) _PATH=../../scds-bf74-osp-control-center;;
    #         stack) _PATH=../;;
    #     esac

    #     unset _CHART_PATH
    #     case $TARGET_REPO_KEY in
    #         okube) _CHART_PATH=./infra/helm/scds-osp-okube-api/Chart.yaml;;
    #         ms) _CHART_PATH=./infra/helm/scds-osp-ms-deploy/Chart.yaml;;
    #         broker-client) _CHART_PATH=./package.json;;
    #         osp-logger) _CHART_PATH=./package.json;;
    #         helm-chart) _CHART_PATH=./Chart.yaml;;
    #         cc) _CHART_PATH=./infra/helm/scds-osp-cc/Chart.yaml;;
    #         stack) get_full_path _CHART_PATH ../chart/Chart.yaml;;
    #     esac
    #     process_repo_tag_publish $_PATH $_CHART_PATH
        
    #     # Now create release and release notes for this new tag
    #     CURRENT_TAG_NAME="$(git tag | sort -V | tail -1)"
    #     if [ "$CURRENT_TAG_NAME" != "" ]; then
    #         info "Generating changelog file for tag $CURRENT_TAG_NAME..."
    #         get_previous_tag LAST_TAG_NAME
           
    #         info "Creating new Git release..."
    #         RELEASE_URL=$(git_release $CURRENT_TAG_NAME)
    #         info "Release created for tag $CURRENT_TAG_NAME: $RELEASE_URL"
    #     fi
    # done
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

    # process_repo_tag_publish

    # Now we create the release for this tag
    # Create release with releasenotes
    git_release() {
        TAG_NAME="$1"

        # Login to Github using gh CLI
        echo "$GITHUB_TOKEN" > .githubtoken
        gh auth login --hostname github.airbus.corp --git-protocol https --with-token < .githubtoken
        rm -rf .githubtoken

        # Create release
        gh release create $TAG_NAME
    }

    user_input GITHUB_TOKEN "Please enter your Github API token:"
)








