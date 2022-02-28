#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR
cd ..
REPO_DIR=$(pwd)
CHART_HOME_PATH=$REPO_DIR

# Create alias for HELM to make compatible for Jenkins build env
if [ -f /home/jenkins/linux-amd64/helm ]; then
  shopt -s expand_aliases
  alias helm='/home/jenkins/linux-amd64/helm'
fi

while [ "$1" != "" ]; do
    case $1 in
        --artifactory-user )
            shift
            ARTI_USER=$1
        ;;
        --artifactory-password )
            shift
            ARTI_PASS=$1
        ;;
        --type )
            shift
            BUMP_TYPE=$1
        ;;
        --do-publish )
            DO_PUBLISH=1
        ;; 
        * ) echo "Invalid parameter detected: $1"
            exit 1
    esac
    shift
done

if [ -z $BUMP_TYPE ]; then
  echo 'Missing param --type [major/feature/bug]'
  exit 1
else
  if [ "$BUMP_TYPE" != "feature" ] && [ "$BUMP_TYPE" != "bug" ] && [ "$BUMP_TYPE" != "major" ]; then
    echo 'Wrong param --type, must be one of: major/feature/bug'
    exit 1
  fi
fi

HELM_REPO_FOUND=$(helm repo list | grep "r-bf74-scds-helm-virtual")
if [ "$HELM_REPO_FOUND" == "" ]; then
  if [ -z $ARTI_USER ]; then
    echo 'Missing param --artifactory-user'
    exit 1
  fi
  if [ -z $ARTI_PASS ]; then
    echo 'Missing param --artifactory-password'
    exit 1
  fi
  # Add artifactory repo
  helm repo add --pass-credentials r-bf74-scds-helm-virtual https://artifactory.2b82.aws.cloud.airbus.corp/artifactory/api/helm/r-bf74-scds-helm-virtual --username "$ARTI_USER" --password "$ARTI_PASS"
  helm repo update
fi

if [ ! -z "$DO_PUBLISH" ] && [ -z $ARTI_PASS ]; then
  echo 'Missing param --artifactory-password'
  exit 1
fi

# ################################################
# ############### VERSION COMPUTE ################
# ################################################

# extract version
CURRENT_APP_VERSION=$(cat $REPO_DIR/Chart.yaml | grep 'version:' | head -1 | cut -d ":" -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

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

if command -v git &> /dev/null; then
  GIT_AVAILABLE=1

  cd $REPO_DIR
  GIT_LOGS=$(git pull --rebase)
  if [ $? -ne 0 ]; then
    echo "$GIT_LOGS"
    echo "Please resolve your local GIT issues first and try again."
    exit 1
  fi
fi

# ################################################
# ######## MAKE SURE WE WANT TO PROSCEED #########
# ################################################
echo ""
echo "=> Old version is $CURRENT_APP_VERSION, will bump up to version $NEW_APP_VERSION"
echo ""
echo "Do you want to prosceed?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) break;;
        No ) exit 0;;
        * ) echo "Invalide answer!";echo "Try again.";;
    esac
done
echo ""

(
  set -Ee

  # ################################################
  # ############ TRY CATCH INTERCEPTORS ############
  # ################################################

  function _catch {
    # Rollback
    echo "An error occured, rolling back changes..."

    if [ -f $REPO_DIR/Chart.yaml.backup ]; then
      rm -rf $CHART_HOME_PATH/Chart.yaml && mv $REPO_DIR/Chart.yaml.backup $CHART_HOME_PATH/Chart.yaml
    fi
  }

  function _finally {
    # Clean up
    if [ -f $REPO_DIR/Chart.yaml.backup ]; then
      rm -rf $REPO_DIR/Chart.yaml.backup
    fi
    echo "Done!"
  }

  trap _catch ERR
  trap _finally EXIT
  
  # ################################################
  # ################ BACKUP FILES ##################
  # ################################################
  cp $CHART_HOME_PATH/Chart.yaml $REPO_DIR/Chart.yaml.backup

  # ################################################
  # ############ UPDATE LOCAL VERSIONS #############
  # ################################################

  # Update HELM chart
  sed -i "0,/version: $CURRENT_APP_VERSION/{s/version: $CURRENT_APP_VERSION/version: $NEW_APP_VERSION/}" $REPO_DIR/Chart.yaml
  sed -i "0,/appVersion: \"$CURRENT_APP_VERSION\"/{s/appVersion: \"$CURRENT_APP_VERSION\"/appVersion: \"$NEW_APP_VERSION\"/}" $REPO_DIR/Chart.yaml

  # ################################################
  # ################# PUSH TO GIT ##################
  # ################################################
  if [ ! -z $GIT_AVAILABLE ]; then
    echo "Pushing to GIT..."
    cd $REPO_DIR
    git add Chart.yaml
    git commit -m "Bumped project up to version $NEW_APP_VERSION" > /dev/null 2>&1
    git push > /dev/null 2>&1
  else
    echo "Warning: GIT is not available, can't push changes."
  fi

  if [ ! -z "$DO_PUBLISH" ]; then
    $REPO_DIR/infra/publish.sh --artifactory-password "$ARTI_PASS"
  fi
)