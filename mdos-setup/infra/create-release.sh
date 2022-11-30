#!/bin/bash
_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ../lib/helpers.sh
source ../lib/components.sh
source ../lib/gittools.sh
if [ -f ./.env ]; then
    source ./.env
fi

GH_OK=$(command_exists gh)
if [ "$GH_OK" == "KO" ]; then
    error "You need to install the gh (GitHub) CLI first" 
    exit 1
fi

while [ "$1" != "" ]; do
    case $1 in
        --gen-cli-bin )
            GEN_CLI_BIN=1
        ;;
        * ) error "Invalid parameter detected: $1"
            exit 1
    esac
    shift
done

# ######################################
# ############### MAIN #################
# ######################################

check_repo_status_clean() {
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
}

collect_new_version() {
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
}

bump_version_on_main_merge_to_release() {
    bump_and_merge() {
        (
            ./mdos-setup/infra/version-bump.sh --repo api --type $1 --force && \
            ./mdos-setup/infra/version-bump.sh --repo broker --type $1 --force && \
            ./mdos-setup/infra/version-bump.sh --repo cli --type $1 --force && \
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

tag_and_publish_to_release() {
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
    CURRENT_APP_VERSION=$(cat $REPO_DIR/mdos-api/package.json | grep '"version":' | head -1 | cut -d ":" -f2 | cut -d'"' -f 2)
    info "Tagging current commit with version v$CURRENT_APP_VERSION..."
    git checkout release > /dev/null 2>&1
    tag $CURRENT_APP_VERSION || on_error "Could not tag commit for repo ${c_warn}$REPO_DIR${c_reset}"
    return_to_branch
    info "Successfully tagged repo ${c_warn}$REPO_DIR${c_reset} on release branch: version ${c_warn}$CURRENT_APP_VERSION${c_reset}"
}

gen_and_publish_release_and_assets() {
    # Now we create the release for this tag
    # Create release with releasenotes
    generate_release_files() {
        # Package files
        cd $REPO_DIR/mdos-cli

        rm -rf ./tmp

        npm run package
        
        # Rename files
        cd ./dist
        for f in ./*.tar.*; do
            if [[ $f == *"darwin-arm64.tar.gz"* ]]; then
                AUID=$f
                AUID=${AUID##*mdos-v${CURRENT_APP_VERSION}-}
                AUID=${AUID%%-darwin-arm64.tar.gz*}
            fi
        done
        if [ ! -z $AUID ]; then
            for f in ./*.tar.*; do
                if [[ $f == *"-win32-"* ]]; then
                    rm -rf $f
                else
                    mv $f ${f/-$AUID/}  
                fi 
            done
        fi

        cd ..
        rm -rf ./dist-cli && mkdir -p ./dist-cli
        mv ./dist/mdos-v${CURRENT_APP_VERSION}*.tar.gz ./dist-cli
        mv ./dist/mdos-v${CURRENT_APP_VERSION}*.tar.xz ./dist-cli
        rm -rf ./dist

        npm run package-win
        cd ./dist/win32
        if [ ! -z $AUID ]; then
            for f in ./*.exe; do
                mv $f ${f/-$AUID/}   
            done
        fi
        cd ../..
        mv ./dist/win32/mdos-v${CURRENT_APP_VERSION}*.exe ./dist-cli

        cd ..
    }

    git_release() {
        TAG_NAME="v$1"

        # Login to Github using gh CLI
        echo "$GITHUB_TOKEN" > .githubtoken
        gh auth login --hostname github.com --git-protocol https --with-token < .githubtoken
        rm -rf .githubtoken

        # Create release
        if [ ! -z $GEN_CLI_BIN ]; then
            gh release create --generate-notes --target release $TAG_NAME ./mdos-cli/dist-cli/*
        else
            gh release create --generate-notes --target release $TAG_NAME
        fi
    }

    if [ -z $GITHUB_TOKEN ]; then
        user_input GITHUB_TOKEN "Please enter your Github API token:"
        echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> $_DIR/.env
    fi

    # Generate assets
    git checkout release > /dev/null 2>&1

    if [ ! -z $GEN_CLI_BIN ]; then
        generate_release_files
    fi

    RELEASE_URL=$(git_release $CURRENT_APP_VERSION)

    # Clean up
    if [ ! -z $GEN_CLI_BIN ]; then
        rm -rf ./mdos-cli/dist/*.tar.*
        rm -rf ./mdos-cli/dist/win32
    fi
}

build_push_docker_hub() {
    # Login to docker hub
    unset DOCKERHUB_LOGIN
    while [ -z $DOCKERHUB_LOGIN ]; do 
        user_input DOCKERHUB_USER "Please enter Dockerhub username:"
        user_input DOCKERHUB_PASS "Please enter Dockerhub password:"

        echo "$DOCKERHUB_PASS" | docker login --username $DOCKERHUB_USER --password-stdin
        if [ $? == 0 ]; then
            DOCKERHUB_LOGIN=1
        else
            error "Wrong credentials"
        fi
    done

    # Cert manager replica image
    cd $REPO_DIR/mdos-setup/dep/images/cert-job-manager
    DOCKER_BUILDKIT=1 docker build -t mdundek/cert-manager-replicate-bot:latest .
    docker push mdundek/cert-manager-replicate-bot:latest

    # LFTP Mirror image
    cd $REPO_DIR/mdos-setup/dep/images/docker-mirror-lftp
    DOCKER_BUILDKIT=1 docker build -t mdundek/mdos-mirror-lftp:latest .
    docker push mdundek/mdos-mirror-lftp:latest

    # LFTP Server image
    cd $REPO_DIR/mdos-ftp
    DOCKER_BUILDKIT=1 docker build -t mdundek/mdos-ftp-bot .
    docker push mdundek/mdos-ftp-bot

    cd $REPO_DIR
    git checkout release > /dev/null 2>&1

    # MDos API
    cd $REPO_DIR/mdos-api

    CURRENT_APP_VERSION=$(cat ./package.json | grep '"version":' | head -1 | cut -d ":" -f2 | cut -d'"' -f 2)

    cp infra/dep/helm/helm .
    cp infra/dep/kubectl/kubectl .
    cp -R ../mdos-setup/dep/mhc-generic/chart ./mhc-generic
    cp -R ../mdos-setup/dep/istio_helm/istio-control/istio-discovery ./istio-discovery
    docker build -t mdundek/mdos-api:$CURRENT_APP_VERSION .
    docker push mdundek/mdos-api:$CURRENT_APP_VERSION
    rm -rf helm
    rm -rf kubectl
    rm -rf mhc-generic
    rm -rf istio-discovery

    # MDos Broker
    cd $REPO_DIR/mdos-broker
    docker build -t mdundek/mdos-broker:$CURRENT_APP_VERSION .
    docker push mdundek/mdos-broker:$CURRENT_APP_VERSION
    
    git checkout $REPO_BRANCH_MDOS > /dev/null 2>&1
}

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

    # Check git status, do not prosceed if pending changes
    check_repo_status_clean

    # Make sure we are on main branch
    git checkout main > /dev/null 2>&1

    # Collect new app version
    collect_new_version

    # Update version and merge with release branch
    info "Processing Repo..."
    bump_version_on_main_merge_to_release $_PATH $_CHART_PATH

    # Create release images and push to docker hub
    build_push_docker_hub

    # Create new tag for version and publish to release
    tag_and_publish_to_release

    # Generate assets and publish all as new  release
    gen_and_publish_release_and_assets

    # Commit and push README file due to version bump
    git checkout $REPO_BRANCH_MDOS > /dev/null 2>&1
    if [ ! -z $GEN_CLI_BIN ]; then
        git add mdos-cli/README.md > /dev/null 2>&1
    fi

    git checkout release > /dev/null 2>&1
    git merge main --commit > /dev/null 2>&1
    git checkout $REPO_BRANCH_MDOS > /dev/null 2>&1
    git merge release --commit > /dev/null 2>&1
    git push > /dev/null 2>&1

    info "Release created for tag $CURRENT_APP_VERSION: $RELEASE_URL"
)