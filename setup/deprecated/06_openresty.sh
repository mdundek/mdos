#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit 1
fi

source ../cli/lib/components.sh
source ../cli/lib/helpers.sh

../cli/install/02_setup_env.sh --extended-nginx
../cli/install/02_setup_env.sh --extended-openresty
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
        --local-ip)
            shift
            LOCAL_IP=$1
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
if [ -z $LOCAL_IP ]; then
    echo "Missing param --local-ip"
    exit 1
fi

systemctl status nginx > /dev/null 2>&1 || NGINX_MISSING=1
if [ -z $NGINX_MISSING ]; then
    systemctl disable nginx
    systemctl stop nginx
fi

# Check if namespace keycloak exists
NS_FOUND=''
while read NS_LINE ; do 
    NS_NAME=`echo "$NS_LINE" | cut -d' ' -f 1`
    if [ "$NS_NAME" == "openresty" ]; then
        NS_FOUND=1
    fi
done < <(kubectl get ns 2>/dev/null)

# Set domains that should not use basic auth here
NO_AUTH_DOMAINS="minio-console.$DOMAIN minio-backup.$DOMAIN"

# Create / update openresty values.yaml file
OPENRESTY_VAL=$(cat ../files/openresty/values.yaml)

OPENRESTY_VAL=$(echo "$OPENRESTY_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[0].hostPath = "/etc/letsencrypt/live/'"$DOMAIN"'/fullchain.pem"')
OPENRESTY_VAL=$(echo "$OPENRESTY_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[0].mountPath = "/etc/letsencrypt/live/'"$DOMAIN"'/fullchain.pem"')

OPENRESTY_VAL=$(echo "$OPENRESTY_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[1].hostPath = "/etc/letsencrypt/live/'"$DOMAIN"'/privkey.pem"')
OPENRESTY_VAL=$(echo "$OPENRESTY_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[1].mountPath = "/etc/letsencrypt/live/'"$DOMAIN"'/privkey.pem"')

OPENRESTY_VAL=$(echo "$OPENRESTY_VAL" | yq '.appComponents[0].persistence.hostpathVolumes[2].hostPath = "/home/'"$PLATFORM_USER"'/.mdos/openresty/conf.d"')

# ################################################
# ############ TRY CATCH INTERCEPTORS ############
# ################################################
(
	set -Ee

	function _catch {
		# Rollback
		if [ ! -z $CATCH_LOG ]; then
			error "An error occured"
		fi
	}

	function _finally {
		# Cleanup
		rm -rf /home/$PLATFORM_USER/kc_tmp
        rm -rf /home/$PLATFORM_USER/openresty.tar
		echo ""
	}

	trap _catch ERR
	trap _finally EXIT

    # Keycloak already deployed?
	if [ ! -z $NS_FOUND ]; then
		yes_no DO_DEL "The openresty namespace already exists. Prosceed anyway?" 1
		if [ "$DO_DEL" == "yes" ]; then
			kubectl delete ns openresty
		else
			exit 1
		fi
	fi

    # Build docker image & push to registry
    cd ../files/openresty
    docker build -t $REGISTRY_HOST/openresty:latest .
    docker save $REGISTRY_HOST/openresty:latest > /home/$PLATFORM_USER/openresty.tar
    k3s ctr image import /home/$PLATFORM_USER/openresty.tar
    cd $_DIR

	# Create keycloak namespace
	kubectl create ns openresty

    # Create Code server endpoint to access it from within openresty namespace
	cat <<EOF | k3s kubectl apply -n openresty -f -
apiVersion: v1
kind: Service
metadata:
   name: codeserver-service-egress
spec:
   clusterIP: None
   ports:
   - protocol: TCP
     port: 8080
     targetPort: 8080
   type: ClusterIP
---
apiVersion: v1
kind: Endpoints
metadata:
  name: codeserver-service-egress
subsets:
  - addresses:
    - ip: $LOCAL_IP
    ports:
      - port: 8080
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: openresty
spec:
  hosts:
    - "*.$DOMAIN"
  gateways:
    - istio-system/https-gateway
  tls:
  - match:
    - port: 443
      sniHosts:
      - "*.$DOMAIN"
    route:
    - destination:
        host: mdos-openresty-openresty.openresty.svc.cluster.local
        port:
          number: 443
EOF

    # Prepare openresty conf.d file
    mkdir -p /home/$PLATFORM_USER/.mdos/openresty
    cp -R ../files/openresty/conf.d /home/$PLATFORM_USER/.mdos/openresty/
    sed -i "s/_DOMAIN_/$DOMAIN/g" /home/$PLATFORM_USER/.mdos/openresty/conf.d/default.conf
    sed -i "s/_NO_AUTH_DOMAINS_/$NO_AUTH_DOMAINS/g" /home/$PLATFORM_USER/.mdos/openresty/conf.d/default.conf
    
    # Deploy keycloak on k3s
	cd ../cli
	CLI_HOME=$(pwd)
	cd $_DIR

	su - $PLATFORM_USER -c "mkdir -p /home/$PLATFORM_USER/kc_tmp"
	echo "$OPENRESTY_VAL" > /home/$PLATFORM_USER/kc_tmp/values.yaml
	chown $PLATFORM_USER:$PLATFORM_USER /home/$PLATFORM_USER/kc_tmp/values.yaml

    cat /home/$PLATFORM_USER/kc_tmp/values.yaml

	su - $PLATFORM_USER -c "$CLI_HOME/mdos_deploy.sh /home/$PLATFORM_USER/kc_tmp --lazy-pull"

    CATCH_LOG=1

    # Now push the openresty image to the private registry in case we add nodes later on
    B64_DECODED=$(echo $REG_CREDS_B64 | base64 --decode)
    IFS=':' read -r -a CREDS <<< "$B64_DECODED"
    REG_USER="${CREDS[0]}"
    REG_PASS="${CREDS[1]}"

    sleep 10
    echo "${REG_PASS}" | docker login $REGISTRY_HOST --username ${REG_USER} --password-stdin
    docker push $REGISTRY_HOST/openresty:latest
)

# apt-get -y install --no-install-recommends wget gnupg ca-certificates
# wget -O - https://openresty.org/package/pubkey.gpg | sudo apt-key add -
# echo "deb http://openresty.org/package/ubuntu $(lsb_release -sc) main"| sudo tee /etc/apt/sources.list.d/openresty.list
# apt update
# apt -y install openresty

# # Create the NGinx config file
# echo "worker_processes  auto;

# events {
#     worker_connections  1024;
# }

# http {
#     include       mime.types;
#     default_type  application/octet-stream;
#     sendfile        on;
#     keepalive_timeout  64;

#     upstream k3s_istio_80 {
#         server localhost:30978;
#     }

#     upstream k3s_keycloak {
#         server localhost:31651;
#     }

#     server {
#         listen 443 ssl http2;
#         server_name cs.$DOMAIN;

#         ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
#         ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

#         ssl_session_cache builtin:1000 shared:SSL:10m;
#         ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
#         ssl_ciphers HIGH:!aNULL:!eNULL:!EXPORT:!CAMELLIA:!DES:!MD5:!PSK:!RC4;
#         ssl_prefer_server_ciphers on;

#         location / {
#             proxy_pass http://127.0.0.1:8080/;
#             proxy_http_version 1.1;
#             proxy_cache_bypass \$http_upgrade;
#             proxy_set_header Upgrade \$http_upgrade;
#             proxy_set_header Connection upgrade;
#             proxy_set_header Host \$host;
#             proxy_set_header Accept-Encoding gzip;
#             proxy_set_header X-Real-IP \$remote_addr;
#             proxy_set_header X-Forwarded-Proto \$scheme;
#             proxy_set_header X-Forwarded-Host \$host;
#             proxy_set_header X-Forwarded-Port \$server_port;
#             proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#             proxy_connect_timeout 30;
#             proxy_send_timeout 30;
#         }
#     }

#     server {
#         listen 443 ssl http2;
#         server_name $NO_AUTH_DOMAINS;

#         ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
#         ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

#         ssl_session_cache builtin:1000 shared:SSL:10m;
#         ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
#         ssl_ciphers HIGH:!aNULL:!eNULL:!EXPORT:!CAMELLIA:!DES:!MD5:!PSK:!RC4;
#         ssl_prefer_server_ciphers on;

#         location / {
#             proxy_pass http://k3s_istio_80;
#             proxy_http_version 1.1;
#             proxy_cache_bypass \$http_upgrade;
#             proxy_set_header Upgrade \$http_upgrade;
#             proxy_set_header Connection upgrade;
#             proxy_set_header Host \$host;
#             proxy_set_header Accept-Encoding gzip;
#             proxy_set_header X-Real-IP \$remote_addr;
#             proxy_set_header X-Forwarded-Proto \$scheme;
#             proxy_set_header X-Forwarded-Host \$host;
#             proxy_set_header X-Forwarded-Port \$server_port;
#             proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#             proxy_connect_timeout 30;
#             proxy_send_timeout 30;
#         }
#     }

#     server {
#         listen 443 ssl http2;
#         server_name keycloak.$DOMAIN;

#         ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
#         ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

#         ssl_session_cache builtin:1000 shared:SSL:10m;
#         ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
#         ssl_ciphers HIGH:!aNULL:!eNULL:!EXPORT:!CAMELLIA:!DES:!MD5:!PSK:!RC4;
#         ssl_prefer_server_ciphers on;

#         location / {
#             proxy_pass https://k3s_keycloak;
#             proxy_http_version 1.1;
#             proxy_cache_bypass \$http_upgrade;
#             proxy_set_header Upgrade \$http_upgrade;
#             proxy_set_header Connection upgrade;
#             proxy_set_header Host \$host;
#             proxy_set_header X-Forwarded-Server \$host;
#             proxy_set_header Accept-Encoding gzip;
#             proxy_set_header X-Real-IP \$remote_addr;
#             proxy_set_header X-Forwarded-Proto \$scheme;
#             proxy_set_header X-Forwarded-Host \$host;
#             proxy_set_header X-Forwarded-Port \$server_port;
#             proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#             proxy_connect_timeout 30;
#             proxy_send_timeout 30;
#         }
#     }

#     server {
#         listen 443 ssl http2;
#         server_name *.$DOMAIN;

#         ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
#         ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

#         ssl_session_cache builtin:1000 shared:SSL:10m;
#         ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
#         ssl_ciphers HIGH:!aNULL:!eNULL:!EXPORT:!CAMELLIA:!DES:!MD5:!PSK:!RC4;
#         ssl_prefer_server_ciphers on;

#         location / {
#             proxy_pass http://k3s_istio_80;
#             proxy_http_version 1.1;
#             proxy_cache_bypass \$http_upgrade;
#             proxy_set_header X-Forwarded-Server \$host;
#             proxy_set_header Upgrade \$http_upgrade;
#             proxy_set_header Connection upgrade;
#             proxy_set_header Host \$host;
#             proxy_set_header Accept-Encoding gzip;
#             proxy_set_header X-Real-IP \$remote_addr;
#             proxy_set_header X-Forwarded-Proto \$scheme;
#             proxy_set_header X-Forwarded-Host \$host;
#             proxy_set_header X-Forwarded-Port \$server_port;
#             proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#             proxy_connect_timeout 30;
#             proxy_send_timeout 30;
#         }
#     }
# }" > /usr/local/openresty/nginx/conf/nginx.conf

# systemctl daemon-reload
# systemctl enable openresty
# systemctl start openresty




#opm install zmartzone/lua-resty-openidc



# curl https://raw.githubusercontent.com/ledgetech/lua-resty-http/master/lib/resty/http.lua > /usr/local/openresty/lualib/resty/http.lua
# curl https://raw.githubusercontent.com/ledgetech/lua-resty-http/master/lib/resty/http_connect.lua > /usr/local/openresty/lualib/resty/http_connect.lua
# curl https://raw.githubusercontent.com/ledgetech/lua-resty-http/master/lib/resty/http_headers.lua > /usr/local/openresty/lualib/resty/http_headers.lua

# curl https://raw.githubusercontent.com/bungle/lua-resty-session/master/lib/resty/session.lua > /usr/local/openresty/lualib/resty/session.lua

# curl https://raw.githubusercontent.com/cdbattags/lua-resty-jwt/master/lib/resty/evp.lua > /usr/local/openresty/lualib/resty/evp.lua
# curl https://raw.githubusercontent.com/cdbattags/lua-resty-jwt/master/lib/resty/jwt-validators.lua > /usr/local/openresty/lualib/resty/jwt-validators.lua 
# curl https://raw.githubusercontent.com/cdbattags/lua-resty-jwt/master/lib/resty/jwt.lua > /usr/local/openresty/lualib/resty/jwt.lua

# curl https://raw.githubusercontent.com/zmartzone/lua-resty-openidc/master/lib/resty/openidc.lua > /usr/local/openresty/lualib/resty/openidc.lua








