#!/bin/bash
_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ../lib/helpers.sh
source ../lib/components.sh

while [ "$1" != "" ]; do
    case $1 in
        --type )
            shift
            BUMP_TYPE=$1
        ;;
        --repo )
            shift
            REPO_NAME=$1
        ;;
        --force|-f )
            FORCE=1
        ;;
        * ) error "Invalid parameter detected: $1"
            exit 1
    esac
    shift
done

if [ -z $REPO_NAME ]; then
  error 'Missing param --repo [cli/api]'
  exit 1
elif [ "$REPO_NAME" != "cli" ] && [ "$REPO_NAME" != "api" ]; then
  error 'Invalid repo name '$REPO_NAME'. Needs to be "cli" or "api"'
  exit 1
else
  if [ "$REPO_NAME" != "cli" ]; then
    REPO_NAME=mdos-cli
  else
    REPO_NAME=mdos-api
  fi
fi

cd ../..
REPO_DIR=$(pwd)

if [ -z $BUMP_TYPE ]; then
  error 'Missing param --type [major/feature/bug]'
  exit 1
else
  if [ "$BUMP_TYPE" != "feature" ] && [ "$BUMP_TYPE" != "bug" ] && [ "$BUMP_TYPE" != "major" ]; then
    error 'Wrong param --type, must be one of: major/feature/bug'
    exit 1
  fi
fi

# ################################################
# ############### VERSION COMPUTE ################
# ################################################

if command -v git &> /dev/null; then
  GIT_AVAILABLE=1

  cd $REPO_DIR
  GIT_LOGS=$(git pull --rebase  origin $(git rev-parse --abbrev-ref HEAD) > /dev/null 2>&1)
  if [ $? -ne 0 ]; then
    error "Please resolve your local GIT issues first and try again."
    exit 1
  fi
else
  error 'The GIT CLI is required. Please install it first'
  exit 1
fi

CURRENT_APP_VERSION=$(cat $REPO_DIR/$REPO_NAME/package.json | grep '"version":' | cut -d ":" -f2 | cut -d'"' -f 2)
major=0
minor=0
build=0

# break down the version number into it's components
regex="([0-9]+).([0-9]+).([0-9]+)"
if [[ $CURRENT_APP_VERSION =~ $regex ]]; then
  major="${BASH_REMATCH[1]}"
  minor="${BASH_REMATCH[2]}"
  build="${BASH_REMATCH[3]}"
fi

# check paramater to see which number to increment
if [[ "$BUMP_TYPE" == "feature" ]]; then
  minor=$(echo $minor + 1 | bc)
  build=0
elif [[ "$BUMP_TYPE" == "bug" ]]; then
  build=$(echo $build + 1 | bc)
elif [[ "$BUMP_TYPE" == "major" ]]; then
  major=$(echo $major+1 | bc)
  build=0
  minor=0
fi

NEW_APP_VERSION="${major}.${minor}.${build}"

# ################################################
# ######## MAKE SURE WE WANT TO PROSCEED #########
# ################################################
if [ -z $FORCE ]; then
  yes_no DO_CONTINUE "MDos CLI: old version is $CURRENT_APP_VERSION, will bump up to version $NEW_APP_VERSION. Do you want to prosceed?"
  if [ "$DO_CONTINUE" == "no" ]; then
    exit 0
  fi
  echo ""
fi

(
  # Get distro and make sure we have proper sed command
  distro
  if [ "$DISTRO" == "darwin" ]; then
    GSED_OK=$(command_exists gsed)
    if [ "$GSED_OK" == "KO" ]; then
      error "On OSX, you need to install the tool 'gsed' (brew install gnu-sed) before you prosceed" 
      exit 1
    fi
  fi

  set -Ee

  # ################################################
  # ############ TRY CATCH INTERCEPTORS ############
  # ################################################

  function _catch {
    # Rollback
    error "$(caller): ${BASH_COMMAND}"
    error "Rolling back changes..."

    if [ -f $REPO_DIR/$REPO_NAME/package.json.backup ]; then
      rm -rf $REPO_DIR/$REPO_NAME/package.json && mv $REPO_DIR/$REPO_NAME/package.json.backup $REPO_DIR/$REPO_NAME/package.json
      if [ ! -z $GIT_AVAILABLE ] && [ ! -z $GIT_PUSHED ]; then
        cd $REPO_DIR
        git add $REPO_NAME/package.json > /dev/null 2>&1
        DO_REVERT_PUSH=1
      fi
    fi

    if [ "$REPO_NAME" == "mdos-cli" ] && [ -f $REPO_DIR/$REPO_NAME/infra/install-linux-mac.sh.backup ]; then
      rm -rf $REPO_DIR/$REPO_NAME/infra/install-linux-mac.sh && mv $REPO_DIR/$REPO_NAME/infra/install-linux-mac.sh.backup $REPO_DIR/$REPO_NAME/infra/install-linux-mac.sh
      if [ ! -z $GIT_AVAILABLE ] && [ ! -z $GIT_PUSHED ]; then
        cd $REPO_DIR
        git add $REPO_NAME/infra/install-linux-mac.sh > /dev/null 2>&1
        DO_REVERT_PUSH=1
      fi
    fi

    if [ ! -z "$DO_REVERT_PUSH" ]; then
      git commit -m "Revert version bump" > /dev/null 2>&1
      git push > /dev/null 2>&1
    fi
  }

  function _finally {
    # Clean up
    if [ -f $REPO_DIR/$REPO_NAME/package.json.backup ]; then
      rm -rf $REPO_DIR/$REPO_NAME/package.json.backup
    fi
    if [ "$REPO_NAME" == "mdos-cli" ] && [ -f $REPO_DIR/$REPO_NAME/infra/install-linux-mac.sh.backup ]; then
      rm -rf $REPO_DIR/$REPO_NAME/infra/install-linux-mac.sh.backup
    fi
    info "Done!"
  }

  trap '_catch' ERR
  trap _finally EXIT
  
  # ################################################
  # ################ BACKUP FILES ##################
  # ################################################
  cp $REPO_DIR/$REPO_NAME/package.json $REPO_DIR/$REPO_NAME/package.json.backup
  if [ "$REPO_NAME" == "mdos-cli" ]; then
    cp $REPO_DIR/$REPO_NAME/infra/install-linux-mac.sh $REPO_DIR/$REPO_NAME/infra/install-linux-mac.sh.backup
  fi

  # ################################################
  # ############ UPDATE LOCAL VERSIONS #############
  # ################################################

  # Update package.json
  if [ "$DISTRO" == "darwin" ]; then
      gsed -i '/"version":/c\    "version": "'"$NEW_APP_VERSION"'",' $REPO_DIR/$REPO_NAME/package.json
  else
      sed -i '/"version":/c\    "version": "'"$NEW_APP_VERSION"'",' $REPO_DIR/$REPO_NAME/package.json
  fi
  if [ "$REPO_NAME" == "mdos-cli" ]; then
    # Update auto install scripts for CLI
    if [ "$DISTRO" == "darwin" ]; then
        gsed -i '/CLI_VERSION=v/c\CLI_VERSION=v'$NEW_APP_VERSION'' $REPO_DIR/$REPO_NAME/infra/install-linux-mac.sh
    else
        sed -i '/CLI_VERSION=v/c\CLI_VERSION=v'$NEW_APP_VERSION'' $REPO_DIR/$REPO_NAME/infra/install-linux-mac.sh
    fi
  fi
  
  # ################################################
  # ################# PUSH TO GIT ##################
  # ################################################
  if [ ! -z $GIT_AVAILABLE ]; then
    info "Pushing to GIT..."
    cd $REPO_DIR
    git add $REPO_NAME/package.json
    if [ "$REPO_NAME" == "mdos-cli" ]; then
      git add $REPO_NAME/infra/install-linux-mac.sh
    fi
    git commit -m "Bumped project up to version $NEW_APP_VERSION" > /dev/null 2>&1
    git push > /dev/null 2>&1
    GIT_PUSHED=1
  else
    warn "GIT is not available, can't push changes."
  fi
)