#!/bin/bash

# ###############################################
# ###### SYNC ONE VOL AT A TIME FUNCTION ########
# ###############################################
sync_volume () {
    CURRENT_SYNC_SOURCE_DIR="${CURRENT_SYNC_SOURCE_DIR%/}"
    CURRENT_SYNC_TARGET_DIR="${CURRENT_SYNC_TARGET_DIR%/}"

    # Validation
    if [ -d "$CURRENT_SYNC_SOURCE_DIR" ]; then
        echo "Found source directory to copy: $CURRENT_SYNC_SOURCE_DIR" 
    else
        echo "Error: Source directory $CURRENT_SYNC_SOURCE_DIR does not exists."
        exit 1
    fi

    if [ -d "$CURRENT_SYNC_TARGET_DIR" ]; then
        echo "Found target directory to copy: $CURRENT_SYNC_TARGET_DIR" 
    else
        echo "Error: Target directory $CURRENT_SYNC_TARGET_DIR does not exists."
        exit 1
    fi

    echo ""
    echo "***************** SYNC VOLUME *********************"
    echo "Source dir: $CURRENT_SYNC_SOURCE_DIR"
    echo "Target dir: $CURRENT_SYNC_TARGET_DIR"
    echo "Type: $CURRENT_SYNC_TYPE"
    echo "***************************************************"
    echo ""

    # Do the Job
    if [ "$CURRENT_SYNC_TYPE" == "full" ]; then
        if [ "$(ls -A $CURRENT_SYNC_TARGET_DIR)" ]; then
            echo "Target directory $CURRENT_SYNC_TARGET_DIR is not empty, skip sync"
            if [ -f /app/config/pxhub.yml ]; then
                cat /app/config/pxhub.yml
            else
                echo "/app/config/pxhub.yml NOT FOUND"
            fi
        else
            echo "Target directory $CURRENT_SYNC_TARGET_DIR is empty, start data sync"
            cp -R $CURRENT_SYNC_SOURCE_DIR/. $CURRENT_SYNC_TARGET_DIR/
            ls -l $CURRENT_SYNC_SOURCE_DIR
            ls -l $CURRENT_SYNC_TARGET_DIR
            if [ -f /app/config/pxhub.yml ]; then
                cat /app/config/pxhub.yml
            else
                echo "/app/config/pxhub.yml NOT FOUND"
            fi
            echo "Files successfully copied"
        fi
    elif [ "$CURRENT_SYNC_TYPE" == "partial" ]; then
        echo "SYNC_TYPE = partial is not implemented yet, skip sync"
    else
        echo "Error: Sync type $CURRENT_SYNC_TYPE not recognized."
        exit 1
    fi
    echo "************** SYNC VOLUME DONE *******************"
    echo ""
}

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