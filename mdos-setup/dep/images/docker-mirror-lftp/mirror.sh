#!/bin/bash

# -=-=-=-=-=-=-=-=-=-=-=-=-=-=- LOGGER FUNCTIONS -=-=-=-=-=-=-=-=-=-=-=-=-=-=-
logInfo() {
    echo '{"level":"info","timestamp":"'"$(date '+%Y-%d-%MT%H:%M:%S.323Z')"'","message":"'$1'","args":[{"source":"'$2'","data":{},"target":"'$3'"}],"errorMessage":"","errorStack":"","service_name":"init-container"}'
}

logError() {
    echo '{"level":"error","timestamp":"'"$(date '+%Y-%d-%MT%H:%M:%S.323Z')"'","message":"'$1'","errorJson":{"source":"'$2'","target":"'$3'","step":"DEPLOY","data":{},"code":500,"message":"'$1'","stack":""},"errorStack":"","service_name":"init-container"}'
}

# -=-=-=-=-=-=-=-=-=-=-=-=-=-=- SYNC ONE VOL AT A TIME FUNCTION -=-=-=-=-=-=-=-=-=-=-=-=-=-=-
sync_volume () {
    CURRENT_SYNC_SOURCE_DIR="${CURRENT_SYNC_SOURCE_DIR%/}"
    CURRENT_SYNC_TARGET_DIR="${CURRENT_SYNC_TARGET_DIR%/}"

    logInfo "Start volume sync" "$CURRENT_SYNC_SOURCE_DIR" "$CURRENT_SYNC_TARGET_DIR"

    if [ -d "$CURRENT_SYNC_TARGET_DIR" ]; then
        logInfo "Found target directory to copy to" "sync_volume.validate" "$CURRENT_SYNC_TARGET_DIR" 
    else
        logError "Target directory $CURRENT_SYNC_TARGET_DIR does not exists." "sync_volume.validate" "$CURRENT_SYNC_TARGET_DIR" 
        exit 1
    fi

    echo ""
    echo "***************** SYNC VOLUME *********************"
    echo "Source dir: $CURRENT_SYNC_SOURCE_DIR"
    echo "Target dir: $CURRENT_SYNC_TARGET_DIR"
    echo "***************************************************"
    echo ""

    # Do the Job
    lftp -u $FTP_USERNAME,$FTP_PASSWORD -p $PORT $PROTOCOL://$HOST <<-EOF
    set ssl:verify-certificate no
    set sftp:auto-confirm yes
    mirror -v -e -s --parallel=$PARALLEL $CURRENT_SYNC_SOURCE_DIR $CURRENT_SYNC_TARGET_DIR
    quit
EOF
}

# CREATED_AT

# -=-=-=-=-=-=-=-=-=-=-=-=-=-=- MAIN -=-=-=-=-=-=-=-=-=-=-=-=-=-=-
main() {
    # ENV VARS using concatenation
    IFS=';' read -ra DOURCE_DIR_ARRAY <<< "$SYNC_SOURCE_DIR"
    IFS=';' read -ra TARGET_DIR_ARRAY <<< "$SYNC_TARGET_DIR"
    ITER=0
    for i in "${DOURCE_DIR_ARRAY[@]}"; do
        CURRENT_SYNC_SOURCE_DIR=${DOURCE_DIR_ARRAY[$ITER]}
        CURRENT_SYNC_TARGET_DIR=${TARGET_DIR_ARRAY[$ITER]}
        ITER=$(expr $ITER + 1)

        # Do the sync...
        sync_volume
    done
}

# -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
# -=-=-=-=-=-=-=-=-=-=-=-=-=-=- SCRIPT START -=-=-=-=-=-=-=-=-=-=-=-=-=-=-
# -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
(
    set -Ee

    function _catch {
        # Rollback
        logError "MDOS dataSync init container failed" "dataSync" "MDOS dataSync initContainer general error"
        GLOBAL_ERROR=1
    }

    function _finally {
        # Cleanup
        if [ -z $GLOBAL_ERROR ]; then
            logInfo "dataSync script finished successfully" "dataSync" "na"
        fi
    }

    trap _catch ERR
    trap _finally EXIT

    main
)