#!/bin/bash

now=$(date)

NEW_IP=$(curl -s https://api.ipify.org)
OLD_IP=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/53dc8d430eb9078f2fd7b9b271b39263/dns_records/dc562e1098434fc823888b30d0a6c9a7" \
    -H "X-Auth-Email: mdundek@gmail.com" \
    -H "X-Auth-Key: fe5beef86732475a7073b122139f64f9f49ee" \
     -H "Content-Type: application/json" | jq -r ' .result.content ')

if [ "$OLD_IP" != "$NEW_IP" ]; then
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/53dc8d430eb9078f2fd7b9b271b39263/dns_records/dc562e1098434fc823888b30d0a6c9a7" \
        -H "X-Auth-Email: mdundek@gmail.com" \
        -H "X-Auth-Key: fe5beef86732475a7073b122139f64f9f49ee" \
        -H "Content-Type: application/json" \
        --data '{"content":"'$NEW_IP'"}'

    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/53dc8d430eb9078f2fd7b9b271b39263/dns_records/034feb725702102cf97f2e42aa6a62c0" \
        -H "X-Auth-Email: mdundek@gmail.com" \
        -H "X-Auth-Key: fe5beef86732475a7073b122139f64f9f49ee" \
        -H "Content-Type: application/json" \
        --data '{"content":"'$NEW_IP'"}'

    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/53dc8d430eb9078f2fd7b9b271b39263/dns_records/f45176b7caf6ac641b45f0c12dfce91f" \
        -H "X-Auth-Email: mdundek@gmail.com" \
        -H "X-Auth-Key: fe5beef86732475a7073b122139f64f9f49ee" \
        -H "Content-Type: application/json" \
        --data '{"content":"'$NEW_IP'"}'

    echo "IP updated on the $now" >> ~/ip_update.log
else
    echo "IP has not changed, checked on the $now" >> ~/ip_update.log
fi