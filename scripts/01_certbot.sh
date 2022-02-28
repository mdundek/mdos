#!/bin/bash

# Create cloudflare credentials file
echo "dns_cloudflare_email = mdundek@gmail.com
dns_cloudflare_api_key = fe5beef86732475a7073b122139f64f9f49ee" > ./cloudflare.ini

# Install certbot
apt-get install certbot

# Install certbot cloudflare plugin
apt -y install python3-certbot-dns-cloudflare

# Create certificate now (will require manual input)
certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials ./cloudflare.ini \
    -d mdundek.network \
    -d *.mdundek.network

# Create nginx stop / start pre and post hooks
sh -c 'printf "#!/bin/sh\nservice nginx stop\n" > /etc/letsencrypt/renewal-hooks/pre/nginx.sh'
sh -c 'printf "#!/bin/sh\nservice nginx start\n" > /etc/letsencrypt/renewal-hooks/post/nginx.sh'
chmod 755 /etc/letsencrypt/renewal-hooks/pre/nginx.sh
chmod 755 /etc/letsencrypt/renewal-hooks/post/nginx.sh

# Set up auto renewal of certificate
SLEEPTIME=$(awk 'BEGIN{srand(); print int(rand()*(3600+1))}'); echo "0 0,12 * * * root sleep $SLEEPTIME && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null