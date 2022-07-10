#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "Please do not run as root"
  exit 1
fi

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

wget https://github.com/coder/code-server/releases/download/v4.0.2/code-server-4.0.2-linux-amd64.tar.gz
tar -xf code-server-4.0.2-linux-amd64.tar.gz
mkdir /home/$PLATFORM_USER/bin
mv code-server-*/ /home/$PLATFORM_USER/bin/
chmod +x /home/$PLATFORM_USER/bin/code-server
mkdir -p /home/$PLATFORM_USER/data

echo "[Unit]
Description=Code-Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/$PLATFORM_USER
Environment=PASSWORD=$CS_PASSWORD
ExecStart=/home/$PLATFORM_USER/bin/code-server --host 127.0.0.1 --user-data-dir /home/$PLATFORM_USER/data --auth password
TimeoutStartSec=0
User=$PLATFORM_USER
RemainAfterExit=yes
Restart=always

[Install]
WantedBy=default.target" > /etc/systemd/system/code-server.service

systemctl daemon-reload
systemctl enable code-server.service

systemctl start code-server.service