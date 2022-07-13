#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit 1
fi

../cli/install/02_setup_env.sh --extended-nginx
source ../cli/.env

while [ "$1" != "" ]; do
    case $1 in
        --platform-user )
            shift
            PLATFORM_USER=$1
        ;; 
        --admin-mdos-username )
            shift
            NGINX_ADMIN_USER=$1
        ;; 
        --admin-mdos-password )
            shift
            NGINX_ADMIN_PASSWORD=$1
        ;; 
        --hostname)
            shift
            DOMAIN=$1
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
if [ -z $NGINX_ADMIN_USER ]; then
    echo "Missing param --admin-user"
    exit 1
fi
if [ -z $NGINX_ADMIN_PASSWORD ]; then
    echo "Missing param --admin-password"
    exit 1
fi
if [ -z $DOMAIN ]; then
    echo "Missing param --hostname"
    exit 1
fi

# Install NGinx
apt install nginx -y
cd /etc/nginx/sites-available/

# Generate the NGinx basic auth credentials
htpasswd -Bbn $NGINX_ADMIN_USER $NGINX_ADMIN_PASSWORD > /etc/nginx/.htpasswd

# Set domains that should not use basic auth here
NO_AUTH_DOMAINS="minio-console.$DOMAIN minio-backup.$DOMAIN"

# Create the NGinx config file
echo "upstream k3s_istio_80 {
    server localhost:30978;
}

server {
    listen 443 ssl http2;
    server_name cs.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

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
    server_name $NO_AUTH_DOMAINS;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

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
    }
}

server {
    listen 443 ssl http2;
    server_name *.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

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

# Start NGinx server
systemctl enable nginx
systemctl start nginx