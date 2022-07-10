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
        --admin-user )
            shift
            ADMIN_USER=$1
        ;; 
        --admin-password )
            shift
            ADMIN_PASSWORD=$1
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

apt install nginx -y
cd /etc/nginx/sites-available/

htpasswd -Bbn $ADMIN_USER $ADMIN_PASSWORD > /etc/nginx/.htpasswd

echo "upstream k3s_istio_80 {
    server localhost:30978;
}

server {
    listen 443 ssl http2;
    server_name cs.mdundek.network;

    ssl_certificate /etc/letsencrypt/live/mdundek.network/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mdundek.network/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host \$host;
        proxy_set_header Accept-Encoding gzip;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_connect_timeout 30;
        proxy_send_timeout 30;

        auth_basic \"Restricted Content\";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}

server {
    listen 443 ssl http2;
    server_name mkdocs-dev.mdundek.network;

    ssl_certificate /etc/letsencrypt/live/mdundek.network/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mdundek.network/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host \$host;
        proxy_set_header Accept-Encoding gzip;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_connect_timeout 30;
        proxy_send_timeout 30;

        auth_basic \"Restricted Content\";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}

server {
    listen 443 ssl http2;
    server_name *.mdundek.network;

    ssl_certificate /etc/letsencrypt/live/mdundek.network/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mdundek.network/privkey.pem;

    location / {
        proxy_pass http://k3s_istio_80; 
        proxy_http_version 1.1;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host \$host;
        proxy_set_header Accept-Encoding gzip;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_connect_timeout 30;
        proxy_send_timeout 30;

        auth_basic \"Restricted Content\";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}" > ./default

# TODO: For larger minio upload files, in /etc/nginx/nginx.config, in `http {}` block, add line: `client_max_body_size 0;`

systemctl enable nginx
systemctl start nginx