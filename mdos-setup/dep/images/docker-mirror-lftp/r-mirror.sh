#!/bin/bash

lftp -u $USERNAME,$PASSWORD -p $PORT $PROTOCOL://$HOST <<-EOF
    set ssl:verify-certificate no
    set sftp:auto-confirm yes
    mirror -v -R -e -s --parallel=$PARALLEL $LOCAL_DIR $REMOTE_DIR
    quit
EOF