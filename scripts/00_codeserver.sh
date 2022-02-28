#!/bin/bash


apt install ufw
ufw allow ssh
ufw allow http
ufw allow https

ufw enable






apt-get install sudo

# Will reequire user interaction
adduser michael

# Add user to sudo group
usermod -aG sudo michael

# Login as user michael
su - michael

wget https://github.com/coder/code-server/releases/download/v4.0.2/code-server-4.0.2-linux-amd64.tar.gz
tar -xf code-server-4.0.2-linux-amd64.tar.gz
mv code-server-*/ bin/
chmod +x bin/code-server
mkdir -p ~/data

sudo su

echo "==> Setting up code server startup service..."

echo "[Unit]
Description=Code-Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/michael
Environment=PASSWORD=li14ebe14
ExecStart=/home/michael/bin/code-server --host 127.0.0.1 --user-data-dir /home/michael/data --auth password
TimeoutStartSec=0
User=michael
RemainAfterExit=yes
Restart=always

[Install]
WantedBy=default.target" > /etc/systemd/system/code-server.service

systemctl daemon-reload
systemctl enable code-server.service
echo "==> Starting code server service (be patient)..."
systemctl start code-server.service

echo "==> Code server is running on port 8080"








apt install nginx -y
cd /etc/nginx/sites-available/

echo "server {
    listen 80;
    server_name cs.mdundek.network;
    # enforce https
    return 301 https://$server_name:443$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cs.mdundek.network;

    ssl_certificate /etc/letsencrypt/live/cs.mdundek.network/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cs.mdundek.network/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Accept-Encoding gzip;
    }
}" > ./code-server











apt install certbot letsencrypt python3-certbot-nginx -y
certbot certonly --standalone --preferred-challenges http -d mdundek.network -d *.mdundek.network --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"

certbot certonly --standalone -d mdundek.network -d *.mdundek.network --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"


certbot --authenticator standalone --installer nginx -d mdundek.network -d *.mdundek.network --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"


certbot certonly --manual --preferred-challenges http -d mdundek.network -d *.mdundek.network --rsa-key-size 4096


./certbot-auto certonly --standalone -d mdundek.network -d *.mdundek.network




docker compose run --rm  certbot certonly --standalone --dry-run -d mdundek.network -d *.mdundek.network




docker run --rm --name temp_certbot \
    -v /data/certbot/letsencrypt:/etc/letsencrypt \
    -v /data/certbot/www:/tmp/letsencrypt \
    certbot/certbot certonly -m mdundek@gmail.com --standalone --dry-run -d mdundek.network -d *.mdundek.network


    --webroot --agree-tos --renew-by-default \
    --preferred-challenges http-01 --server https://acme-v02.api.letsencrypt.org/directory \
    --text




docker run --rm --name temp_certbot \
    -v /data/certbot/letsencrypt:/etc/letsencrypt \
    -v /data/certbot/www:/tmp/letsencrypt \
    certbot/certbot \
    certonly --webroot --agree-tos --renew-by-default --http-01-port 8484 \
    --preferred-challenges http-01 --server https://acme-v02.api.letsencrypt.org/directory \
    --text --dry-run --email mdundek@gmail.com \
    -w /tmp/letsencrypt -d mdundek.network




docker run --rm --name temp_certbot \
    -v /data/certbot/letsencrypt:/etc/letsencrypt \
    -v /data/certbot/www:/tmp/letsencrypt \
    certbot/certbot \
    certonly --standalone -m mdundek@gmail.com --agree-tos -n -d mdundek.network --http-01-port 8484 --dry-run





certbot certonly --manual --manual-auth-hook /etc/letsencrypt/acme-dns-auth.py --preferred-challenges dns --debug-challenges -d \*.mdundek.network -d mdundek.network


certbot certonly --standalone --preferred-challenges http --debug-challenges -d \*.mdundek.network -d mdundek.network --dry-run