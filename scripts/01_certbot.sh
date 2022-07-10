#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "Please do not run as root"
  exit 1
fi

../cli/02_setup_env.sh --extended-cf
source ../cli/.env

while [ "$1" != "" ]; do
    case $1 in
        --cloudflare-email )
            shift
            CF_EMAIL=$1
        ;; 
        --cloudflare-api-key )
            shift
            CF_TOKEN=$1
        ;; 
        --domain )
            shift
            DOMAIN=$1
        ;; 
        * )              echo "Invalid parameter detected => $1"
            exit 1
    esac
    shift
done

if [ -z $CF_EMAIL ]; then
    echo "Missing param --cloudflare-email"
    exit 1
fi
if [ -z $CF_TOKEN ]; then
    echo "Missing param --cloudflare-api-key"
    exit 1
fi
if [ -z $DOMAIN ]; then
    echo "Missing param --domain"
    exit 1
fi

# Create cloudflare credentials file
echo "dns_cloudflare_email = $CF_EMAIL
dns_cloudflare_api_key = $CF_TOKEN" > ./cloudflare.ini

# Install certbot
apt-get install certbot python3-certbot-dns-cloudflare -y

# Create certificate now (will require manual input)
certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials ./cloudflare.ini \
    -d $DOMAIN \
    -d *.$DOMAIN \
    -n

# Create nginx stop / start pre and post hooks
sh -c 'printf "#!/bin/sh\nservice nginx stop\n" > /etc/letsencrypt/renewal-hooks/pre/nginx.sh'
sh -c 'printf "#!/bin/sh\nservice nginx start\n" > /etc/letsencrypt/renewal-hooks/post/nginx.sh'
chmod 755 /etc/letsencrypt/renewal-hooks/pre/nginx.sh
chmod 755 /etc/letsencrypt/renewal-hooks/post/nginx.sh

# Set up auto renewal of certificate
SLEEPTIME=$(awk 'BEGIN{srand(); print int(rand()*(3600+1))}'); echo "0 0,12 * * * root sleep $SLEEPTIME && certbot renew -q" | tee -a /etc/crontab > /dev/null