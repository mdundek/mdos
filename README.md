# mdundek.network

## NGinx

```sh
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
```

nano /etc/nginx/sites-enabled/default

```sh
server {
    listen 80;
    listen [::]:80;
    server_name cs.mdundek.network;
    location / {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Accept-Encoding gzip;
    }
}

server {
    listen 81;
    listen [::]:81;
    server_name mdundek.network;
    location ~ /.well-known/acme-challenge {
        proxy_pass http://localhost:8484;
        proxy_set_header Host $host;
    }
}
```

## Certbot

```sh
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
    certonly --webroot --agree-tos --renew-by-default \
    --preferred-challenges http-01 --server https://acme-v02.api.letsencrypt.org/directory \
    --text --dry-run --email mdundek@gmail.com \
    -w /tmp/letsencrypt -d mdundek.network




docker run --rm --name temp_certbot -p 80:80 -v /data/certbot/letsencrypt:/etc/letsencrypt -v /data/certbot/www:/tmp/letsencrypt certbot/certbot \
    certonly --standalone -m mdundek@gmail.com --agree-tos -n -d mdundek.network -d *.mdundek.network --preferred-challenges http --dry-run





certbot certonly --manual --manual-auth-hook /etc/letsencrypt/acme-dns-auth.py --preferred-challenges dns --debug-challenges -d \*.mdundek.network -d mdundek.network


certbot certonly --standalone --preferred-challenges http --debug-challenges -d \*.mdundek.network -d mdundek.network --dry-run
```

certbot --non-interactive --agree-tos --email mdundek@gmail.com certonly \
 --preferred-challenges dns --authenticator certbot-dns-standalone:dns-standalone \
 --certbot-dns-standalone:dns-standalone-address=0.0.0.0 \
 --certbot-dns-standalone:dns-standalone-ipv6-address=:: \
 --certbot-dns-standalone:dns-standalone-port=80 \
 -d mdunde.network --dry-run

certbot certonly \
 --dns-cloudflare \
 --dns-cloudflare-credentials /home/mdundek/cloudflare.ini \
 -d mdundek.network \
 -d \*.mdundek.network --dry-run
