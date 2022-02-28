#!/bin/bash

wget https://github.com/coder/code-server/releases/download/v4.0.2/code-server-4.0.2-linux-amd64.tar.gz
tar -xf code-server-4.0.2-linux-amd64.tar.gz
sudo mv code-server-*/ bin/
sudo chmod +x bin/code-server
mkdir -p ~/data

sudo su

echo "[Unit]
Description=Code-Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/mdundek
Environment=PASSWORD=li14ebe14
ExecStart=/home/mdundek/bin/code-server --host 127.0.0.1 --user-data-dir /home/mdundek/data --auth password
TimeoutStartSec=0
User=mdundek
RemainAfterExit=yes
Restart=always

[Install]
WantedBy=default.target" > /etc/systemd/system/code-server.service

systemctl daemon-reload
systemctl enable code-server.service

systemctl start code-server.service
