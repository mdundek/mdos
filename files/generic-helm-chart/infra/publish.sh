#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR
cd ..
CHART_DIR=$(pwd)

# Chart name
CHART_NAME="scds-generic-stateless-helm"

while [ "$1" != "" ]; do
    case $1 in
        --artifactory-password )
            shift
            ARTI_PASS=$1
        ;;
        * )              echo "Invalid parameter detected"
            exit 1
    esac
    shift
done

if [ -z $ARTI_PASS ]; then
    echo 'Parameter --artifactory-password is missing!'
    exit 1
fi

(
  set -Ee

  # ################################################
  # ############ TRY CATCH INTERCEPTORS ############
  # ################################################

  function _catch {
    # Rollback
    echo "An error occured"
    
  }

  function _finally {
    # Cleanup
    rm -rf $CHART_DIR/*.tgz || true
  }

  trap _catch ERR
  trap _finally EXIT
  
  # ################################################
  # ############### TRY CATCH BLOCK ################
  # ################################################

  # Build the docker image
  cd $CHART_DIR
  if [ -f /home/jenkins/linux-amd64/helm ]; then
    /home/jenkins/linux-amd64/helm package .
  else
    helm package .
  fi
  
  # extract version
  CHART_V=$(cat ./Chart.yaml | grep 'version:' | head -1 | cut -d ":" -f2 | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

  C_OUT=$(curl -s -H "X-JFrog-Art-Api:$ARTI_PASS" -T $CHART_NAME-$CHART_V.tgz "https://artifactory.2b82.aws.cloud.airbus.corp/artifactory/r-bf74-scds-helm-local/$CHART_NAME-$CHART_V.tgz")
  SUCCESS_MARK=$(echo "$C_OUT" | grep "downloadUri")
  if [ "$SUCCESS_MARK" == "" ]; then
    echo "Could not publish chart: $CHART_NAME-$CHART_V"
    echo "Error: $C_OUT"
    exit 1
  else
    echo "Published chart: $CHART_NAME-$CHART_V"
  fi
)
