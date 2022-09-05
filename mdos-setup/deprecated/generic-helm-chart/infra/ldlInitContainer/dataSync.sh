#!/bin/bash

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
# ###### SYNC ONE VOL AT A TIME FUNCTION ########
# ###############################################
sync_volume () {
    CURRENT_SYNC_SOURCE_DIR="${CURRENT_SYNC_SOURCE_DIR%/}"
    CURRENT_SYNC_TARGET_DIR="${CURRENT_SYNC_TARGET_DIR%/}"

    logInfo "Start volume sync" "$CURRENT_SYNC_SOURCE_DIR" "$CURRENT_SYNC_TARGET_DIR"

    # Validation
    if [ -d "$CURRENT_SYNC_SOURCE_DIR" ]; then
        logInfo "Found source directory to copy" "sync_volume.validate" "$CURRENT_SYNC_SOURCE_DIR"
    else
        logError "Source directory $CURRENT_SYNC_SOURCE_DIR does not exists." "sync_volume.validate" "$CURRENT_SYNC_SOURCE_DIR" 
        exit 1
    fi

    if [ -d "$CURRENT_SYNC_TARGET_DIR" ]; then
        logInfo "Found target directory to copy to" "sync_volume.validate" "$CURRENT_SYNC_TARGET_DIR" 
    else
        logError "Target directory $CURRENT_SYNC_TARGET_DIR does not exists." "sync_volume.validate" "$CURRENT_SYNC_TARGET_DIR" 
        exit 1
    fi

    # echo ""
    # echo "***************** SYNC VOLUME *********************"
    # echo "Source dir: $CURRENT_SYNC_SOURCE_DIR"
    # echo "Target dir: $CURRENT_SYNC_TARGET_DIR"
    # echo "Type: $CURRENT_SYNC_TYPE"
    # echo "***************************************************"
    # echo ""

    # Do the Job
    if [ "$CURRENT_SYNC_TYPE" == "full" ]; then
        if [ "$(ls -A $CURRENT_SYNC_TARGET_DIR)" ]; then
            logInfo "Target directory $CURRENT_SYNC_TARGET_DIR is not empty, skip dataSync" "dataSync.checkTargetFolderEmpty" "$CURRENT_SYNC_TARGET_DIR"
        else
            logInfo "Target directory $CURRENT_SYNC_TARGET_DIR is empty, start dataSync" "dataSync.checkTargetFolderEmpty" "$CURRENT_SYNC_TARGET_DIR"
            cp -R $CURRENT_SYNC_SOURCE_DIR/. $CURRENT_SYNC_TARGET_DIR/
            logInfo "Files successfully copied" "dataSync.checkTargetFolderEmpty" "$CURRENT_SYNC_TARGET_DIR"
        fi
    elif [ "$CURRENT_SYNC_TYPE" == "partial" ]; then
        logInfo "Start partial dataSync" "dataSync.rsync" "$CURRENT_SYNC_SOURCE_DIR-> $CURRENT_SYNC_TARGET_DIR"
        rsync -au --delete "$CURRENT_SYNC_SOURCE_DIR/" "$CURRENT_SYNC_TARGET_DIR"
    else
        logError "Sync type $CURRENT_SYNC_TYPE not recognized." "dataSync.syncTypeCheck" "$CURRENT_SYNC_TYPE"
        exit 1
    fi
    # echo "************** SYNC VOLUME DONE *******************"
    # echo ""
}

main() {
    # ############ ENV VARS using concatenation ############
    IFS=';' read -ra DOURCE_DIR_ARRAY <<< "$SYNC_SOURCE_DIR"
    IFS=';' read -ra TARGET_DIR_ARRAY <<< "$SYNC_TARGET_DIR"
    IFS=';' read -ra TYPE_ARRAY <<< "$SYNC_TYPE"
    ITER=0
    for i in "${DOURCE_DIR_ARRAY[@]}"; do
        CURRENT_SYNC_SOURCE_DIR=${DOURCE_DIR_ARRAY[$ITER]}
        CURRENT_SYNC_TARGET_DIR=${TARGET_DIR_ARRAY[$ITER]}
        CURRENT_SYNC_TYPE=${TYPE_ARRAY[$ITER]}
        ITER=$(expr $ITER + 1)

        # Do the sync...
        sync_volume
    done
}

(
    set -Ee

    function _catch {
        # Rollback
        logError "LDL dataSync init container failed" "dataSync" "LDL dataSync initContainer general error"
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