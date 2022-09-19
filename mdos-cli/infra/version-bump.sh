#!/bin/bash
_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

source ./lib/helpers.sh
source ./lib/components.sh

cd ../..
REPO_DIR=$(pwd)

while [ "$1" != "" ]; do
    case $1 in
        --type )
            shift
            BUMP_TYPE=$1
        ;;
        --force|-f )
            FORCE=1
        ;;
        * ) error "Invalid parameter detected: $1"
            exit 1
    esac
    shift
done

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
fi

CURRENT_APP_VERSION=$(cat $REPO_DIR/mdos-cli/package.json | grep '"version":' | cut -d ":" -f2 | cut -d'"' -f 2)
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
  set -Ee

  # ################################################
  # ############ TRY CATCH INTERCEPTORS ############
  # ################################################

  function _catch {
    # Rollback
    error "Rolling back changes..."

    if [ -f $REPO_DIR/mdos-cli/package.json.backup ]; then
      rm -rf $REPO_DIR/mdos-cli/package.json && mv $REPO_DIR/mdos-cli/package.json.backup $REPO_DIR/mdos-cli/package.json
      if [ ! -z $GIT_AVAILABLE ] && [ ! -z $GIT_PUSHED ]; then
        cd $REPO_DIR/mdos-cli
        git add package.json > /dev/null 2>&1
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
    if [ -f $REPO_DIR/mdos-cli/package.json.backup ]; then
      rm -rf $REPO_DIR/mdos-cli/package.json.backup
    fi
    info "Done!"
  }

  trap _catch ERR
  trap _finally EXIT
  
  # ################################################
  # ################ BACKUP FILES ##################
  # ################################################
  cp $REPO_DIR/mdos-cli/package.json $REPO_DIR/package.json.backup

  # ################################################
  # ############ UPDATE LOCAL VERSIONS #############
  # ################################################

  # Update package.json
  sed -i '/"version":/c\  "version": "'"$NEW_APP_VERSION"'",' $REPO_DIR/mdos-cli/package.json

  # ################################################
  # ################# PUSH TO GIT ##################
  # ################################################
  if [ ! -z $GIT_AVAILABLE ]; then
    info "Pushing to GIT..."
    cd $REPO_DIR
    git add mdos-cli/package.json
    git commit -m "Bumped project up to version $NEW_APP_VERSION" > /dev/null 2>&1
    git push > /dev/null 2>&1
    GIT_PUSHED=1
  else
    warn "GIT is not available, can't push changes."
  fi
)