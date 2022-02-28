#!/bin/bash

apt install nginx -y
cd /etc/nginx/sites-available/

systemctl stop nginx

echo "server {
    listen 443 ssl http2;
    server_name cs.mdundek.network;

    ssl_certificate /etc/letsencrypt/live/mdundek.network/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mdundek.network/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Accept-Encoding gzip;
    }
}" > ./default

systemctl enable nginx
systemctl start nginx