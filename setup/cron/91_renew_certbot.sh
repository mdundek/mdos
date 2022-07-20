#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

now=$(date)

CERTBOT_LOGS="$(certbot renew)"

echo "Certificate renewal attempt on the $now:" >> ./91_renew_certbot.log
echo "$CERTBOT_LOGS" >> ./91_renew_certbot.log
echo "" >> ./91_renew_certbot.log