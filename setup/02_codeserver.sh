#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit 1
fi

../cli/install/02_setup_env.sh --extended-cs
source ../cli/.env

while [ "$1" != "" ]; do
    case $1 in
        --platform-user )
            shift
            PLATFORM_USER=$1
        ;; 
        --cs-password )
            shift
            CS_PASSWORD=$1
        ;; 
        * ) echo "Invalid parameter detected => $1"
            exit 1
    esac
    shift
done

if [ -z $PLATFORM_USER ]; then
    echo "Missing param --platform-user"
    exit 1
fi

if [ -z $CS_PASSWORD ]; then
    echo "Missing param --cs-password"
    exit 1
fi

CS_VERSION="4.5.0"

wget https://github.com/coder/code-server/releases/download/v$CS_VERSION/code-server-$CS_VERSION-linux-amd64.tar.gz
tar -xf code-server-$CS_VERSION-linux-amd64.tar.gz
mkdir -p /home/$PLATFORM_USER/bin
mv code-server-$CS_VERSION-linux-amd64 /home/$PLATFORM_USER/bin/
mv /home/$PLATFORM_USER/bin/code-server-$CS_VERSION-linux-amd64 /home/$PLATFORM_USER/bin/code-server
chmod +x /home/$PLATFORM_USER/bin/code-server/code-server
chown -R $PLATFORM_USER:$PLATFORM_USER /home/$PLATFORM_USER/bin/code-server
mkdir -p /home/$PLATFORM_USER/data/
chown $PLATFORM_USER:$PLATFORM_USER /home/$PLATFORM_USER/data/

echo "[Unit]
Description=Code-Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/$PLATFORM_USER
Environment=PASSWORD=$CS_PASSWORD
ExecStart=/home/$PLATFORM_USER/bin/code-server/code-server --host 0.0.0.0 --user-data-dir /home/$PLATFORM_USER/data --auth password
TimeoutStartSec=0
User=$PLATFORM_USER
RemainAfterExit=yes
Restart=always

[Install]
WantedBy=default.target" > /etc/systemd/system/code-server.service

systemctl daemon-reload
systemctl enable code-server.service

systemctl start code-server.service