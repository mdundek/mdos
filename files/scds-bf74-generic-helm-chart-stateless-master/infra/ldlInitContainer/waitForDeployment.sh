#!/bin/bash

APISERVER=https://kubernetes.default.svc
SERVICEACCOUNT=/var/run/secrets/kubernetes.io/serviceaccount
NAMESPACE=$(cat ${SERVICEACCOUNT}/namespace)
TOKEN=$(cat ${SERVICEACCOUNT}/token)
CACERT=${SERVICEACCOUNT}/ca.crt

# ###############################################
# ######## WAIT FOR APP READY FUNCTION ##########
# ###############################################
wait_for_app () {
  while :
  do
    POD_STATUS_LIST=$(curl -s --cacert ${CACERT} --header "Authorization: Bearer ${TOKEN}" -X GET ${APISERVER}/api/v1/namespaces/${NAMESPACE}/pods | jq -c ".items[] | select( .metadata.labels.scdsAcbmAppCompUUID == \"$CURRENT_APP_UUID_WAIT\") | .status.phase")
    IFS=$'\n' STATUS_ARRAY=($POD_STATUS_LIST)
    POD_READY=0
    for POD_STATUS in "${STATUS_ARRAY[@]}"; do
      POD_STATUS=$(echo "$POD_STATUS" | tr -d '"')
      if [ "$POD_STATUS" == "Running" ]; then
        echo "Pod ready!"
        POD_READY=1
      fi
    done
    if [ $POD_READY == 1 ]; then
      break
    else
      sleep 3
    fi
  done
}

# ############ ENV VARS using concatenation ############
IFS=';' read -ra APP_UUID_WAIT_ARRAY <<< "$APP_UUID_WAIT_LIST"
ITER=0
for i in "${APP_UUID_WAIT_ARRAY[@]}"; do
    CURRENT_APP_UUID_WAIT=${APP_UUID_WAIT_ARRAY[$ITER]}
    ITER=$(expr $ITER + 1)

    # Wait for app to become ready
    wait_for_app
done