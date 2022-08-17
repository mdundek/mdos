#!/bin/bash

logInfo() {
    echo '{"level":"info","timestamp":"'"$(date '+%Y-%d-%MT%H:%M:%S.323Z')"'","message":"'$1'","args":[{"source":"'$2'","data":{},"target":"'$3'"}],"errorMessage":"","errorStack":"","service_name":"init-container"}'
}

logError() {
    echo '{"level":"error","timestamp":"'"$(date '+%Y-%d-%MT%H:%M:%S.323Z')"'","message":"'$1'","errorJson":{"source":"'$2'","target":"'$3'","step":"DEPLOY","data":{},"code":500,"message":"'$1'","stack":""},"errorStack":"","service_name":"init-container"}'
}

# ###############################################
# ###### SYNC ONE VOL AT A TIME FUNCTION ########
# ###############################################
sync_volume () {
    CURRENT_SYNC_SOURCE_BUCKET="${CURRENT_SYNC_SOURCE_BUCKET%/}"
    CURRENT_SYNC_TARGET_DIR="${CURRENT_SYNC_TARGET_DIR%/}"

    logInfo "Start volume sync" "$CURRENT_SYNC_SOURCE_BUCKET" "$CURRENT_SYNC_TARGET_DIR"

    # Validation
    # if [ -d "$CURRENT_SYNC_SOURCE_BUCKET" ]; then
    #     logInfo "Found source directory to copy" "sync_volume.validate" "$CURRENT_SYNC_SOURCE_BUCKET"
    # else
    #     logError "Source directory $CURRENT_SYNC_SOURCE_BUCKET does not exists." "sync_volume.validate" "$CURRENT_SYNC_SOURCE_BUCKET" 
    #     exit 1
    # fi

    if [ -d "$CURRENT_SYNC_TARGET_DIR" ]; then
        logInfo "Found target directory to copy to" "sync_volume.validate" "$CURRENT_SYNC_TARGET_DIR" 
    else
        logError "Target directory $CURRENT_SYNC_TARGET_DIR does not exists." "sync_volume.validate" "$CURRENT_SYNC_TARGET_DIR" 
        exit 1
    fi

    # echo ""
    # echo "***************** SYNC VOLUME *********************"
    # echo "Source dir: $CURRENT_SYNC_SOURCE_BUCKET"
    # echo "Target dir: $CURRENT_SYNC_TARGET_DIR"
    # echo "***************************************************"
    # echo ""

    # Do the Job
    /usr/src/ops/mc config host add mdosminio http://minio.minio.svc.cluster.local:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY --api S3v4
    /usr/src/ops/mc mirror mdosminio/$CURRENT_SYNC_SOURCE_BUCKET $CURRENT_SYNC_TARGET_DIR --overwrite --remove --preserve

    logInfo "Files successfully synched" "dataSync.checkTargetFolderEmpty" "$CURRENT_SYNC_TARGET_DIR"
}

main() {
    # ############ ENV VARS using concatenation ############
    IFS=';' read -ra DOURCE_DIR_ARRAY <<< "$SYNC_SOURCE_BUCKET"
    IFS=';' read -ra TARGET_DIR_ARRAY <<< "$SYNC_TARGET_DIR"
    ITER=0
    for i in "${DOURCE_DIR_ARRAY[@]}"; do
        CURRENT_SYNC_SOURCE_BUCKET=${DOURCE_DIR_ARRAY[$ITER]}
        CURRENT_SYNC_TARGET_DIR=${TARGET_DIR_ARRAY[$ITER]}
        ITER=$(expr $ITER + 1)

        # Do the sync...
        sync_volume
    done
}

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