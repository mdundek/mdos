#!/bin/bash

APISERVER=https://kubernetes.default.svc
SERVICEACCOUNT=/var/run/secrets/kubernetes.io/serviceaccount
NAMESPACE=$(cat ${SERVICEACCOUNT}/namespace)
TOKEN=$(cat ${SERVICEACCOUNT}/token)
CACERT=${SERVICEACCOUNT}/ca.crt

logInfo() {
    if [ "$PROCESS_ID" == "none" ]; then
        echo '{"level":"info","timestamp":"'"$(date '+%Y-%d-%MT%H:%M:%S.323Z')"'","message":"'$1'","args":[{"source":"'$2'","data":{},"target":"'$3'"}],"errorMessage":"","errorStack":"","service_name":"init-container"}'
    else
        echo '{"level":"info","timestamp":"'"$(date '+%Y-%d-%MT%H:%M:%S.323Z')"'","process_id":"'$PROCESS_ID'","process_step":"DEPLOY","message":"'$1'","args":[{"source":"'$2'","data":{},"target":"'$3'"}],"errorMessage":"","errorStack":"","service_name":"init-container"}'
    fi
}

logError() {
    if [ "$PROCESS_ID" == "none" ]; then
        echo '{"level":"error","timestamp":"'"$(date '+%Y-%d-%MT%H:%M:%S.323Z')"'","message":"'$1'","errorJson":{"source":"'$2'","target":"'$3'","step":"DEPLOY","data":{},"code":500,"message":"'$1'","stack":""},"errorStack":"","service_name":"init-container"}'
    else
        echo '{"level":"error","timestamp":"'"$(date '+%Y-%d-%MT%H:%M:%S.323Z')"'","process_id":"'$PROCESS_ID'","process_step":"DEPLOY","message":"'$1'","errorJson":{"source":"'$2'","target":"'$3'","step":"DEPLOY","data":{},"code":500,"message":"'$1'","stack":""},"errorStack":"","service_name":"init-container"}'
    fi
}

# ###############################################
# ######## WAIT FOR APP READY FUNCTION ##########
# ###############################################
wait_for_app () {
  while :
  do
    POD_STATUS_LIST=$(curl -s --cacert ${CACERT} --header "Authorization: Bearer ${TOKEN}" -X GET ${APISERVER}/api/v1/namespaces/${NAMESPACE}/pods | jq -c ".items[] | select(.metadata.labels.appCompUUID == \"$appCompUUID\" and .metadata.labels.mdosAcbmAppCompName == \"$mdosAcbmAppCompName\" and .metadata.labels.appUUID == \"$appUUID\") | .status.phase")
    IFS=$'\n' STATUS_ARRAY=($POD_STATUS_LIST)
    POD_READY=0
    for POD_STATUS in "${STATUS_ARRAY[@]}"; do
      POD_STATUS=$(echo "$POD_STATUS" | tr -d '"')
      if [ "$POD_STATUS" == "Running" ]; then
        POD_READY=1
      fi
    done
    if [ $POD_READY == 1 ]; then
      logInfo "Pod ready!" "waitForDeployment" "podReadynessCheck"
      break
    else
      logInfo "Pod not ready yet, retry in 3 seconds" "waitForDeployment" "podReadynessCheck"
      sleep 3
    fi
  done
}

main() {
  # ############ ENV VARS using concatenation ############
  IFS=';' read -ra APP_UUID_WAIT_ARRAY <<< "$APP_UUID_WAIT_LIST"
  ITER=0
  for i in "${APP_UUID_WAIT_ARRAY[@]}"; do
      CURRENT_APP_UUID_WAIT=${APP_UUID_WAIT_ARRAY[$ITER]}

      IFS='||' read -ra APP_PARAMS_WAIT_ARRAY <<< "$CURRENT_APP_UUID_WAIT"
      ITER_P=0
      for y in "${APP_PARAMS_WAIT_ARRAY[@]}"; do
        if [ ! -z $y ]; then
          if [ $ITER_P == "0" ]; then
            appCompUUID="$y"
          elif [ $ITER_P == "1" ]; then
            mdosAcbmAppCompName="$y"
          elif [ $ITER_P == "2" ]; then
            appUUID="$y"
          fi
          ITER_P=$(expr $ITER_P + 1)
        fi
      done
     
      ITER=$(expr $ITER + 1)

      # Wait for app to become ready
      set +Ee
      wait_for_app
      set -Ee
  done
}

(
    set -Ee

    function _catch {
        # Rollback
        logError "LDL waitForDeployment init container failed" "waitForDeployment" "LDL waitForDeployment initContainer general error"
        GLOBAL_ERROR=1
    }

    function _finally {
        # Cleanup
        if [ -z $GLOBAL_ERROR ]; then
            logInfo "waitForDeployment script finished successfully" "waitForDeployment" "na"
        fi
    }

    trap _catch ERR
    trap _finally EXIT

    main
)