#!/bin/bash

_DIR="$(cd "$(dirname "$0")" && pwd)"
cd $_DIR

# ############################################
# ############## CHECKS & INIT ###############
# ############################################

if [ "$EUID" -ne 0 ]
    then echo "Please run as root"
    exit 1
fi

source ./lib/components.sh
source ./lib/helpers.sh

# ############################################
function install_istio() {
    kubectl create namespace istio-system

    # Install Istio base
    helm upgrade --install istio-base ./dep/istio_helm/base -n istio-system

    # Install Istiod
    echo "meshConfig:
  accessLogFile: /dev/stdout
  extensionProviders:
  - name: oauth2-proxy
    envoyExtAuthzHttp:
      service: oauth2-proxy.oauth2-proxy.svc.cluster.local
      port: 4180
      includeRequestHeadersInCheck:
      - cookie
      - x-forwarded-access-token
      headersToUpstreamOnAllow:
      - authorization
      - cookie
      - path
      - x-auth-request-access-token
      - x-auth-request-groups
      - x-auth-request-email
      - x-forwarded-access-token
      headersToDownstreamOnDeny:
      - set-cookie
      - content-type" > ./istiod-values.yaml
    helm upgrade --install istiod ./dep/istio_helm/istio-control/istio-discovery -f ./istiod-values.yaml -n istio-system --wait

    # Install Istio ingress
    sed -i 's/type: LoadBalancer/type: NodePort/g' ./dep/istio_helm/gateways/istio-ingress/values.yaml
    sed -i 's/type: ClusterIP/type: NodePort/g' ./dep/istio_helm/gateways/istio-ingress/values.yaml
    helm upgrade --install istio-ingress ./dep/istio_helm/gateways/istio-ingress -n istio-system


    kubectl create -n istio-system secret tls httpbin-credential --key=$SSL_ROOT/privkey.pem --cert=$SSL_ROOT/fullchain.pem

    cat <<EOF | k3s kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: https-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "*.$DOMAIN"
    tls:
      mode: SIMPLE
      credentialName: httpbin-credential
---
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: https-gateway-mdos
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "registry.$DOMAIN"
    - "keycloak.$DOMAIN"
    tls:
      mode: PASSTHROUGH
EOF
}

# ############################################
install_oidc_proxy() {
    helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests
    helm repo update
    kubectl create ns oauth2-proxy && kubectl label ns oauth2-proxy istio-injection=enabled

    echo "service:
  portNumber: 4180
extraArgs:
  provider: oidc
  cookie-samesite: lax
  cookie-refresh: 1h
  cookie-expire: 4h
  cookie-domain: \"*.$DOMAIN\"
  set-xauthrequest: true
  set-authorization-header: true
  pass-authorization-header: true 
  pass-host-header: true
  pass-access-token: true
  email-domain: \"*\"
  upstream: static://200
  skip-provider-button: true
  whitelist-domain: $WEB_HOST
  oidc-issuer-url: $OIDC_ISSUER_URL
config:
  clientID: \"$CLIENT_ID\"
  clientSecret: \"$CLIENT_SECRET\"
  cookieSecure: true
  cookieSecret: \"$COOKIE_SECRET\"
  cookieName: \"_oauth2_proxy_isio\"" > ./oauth2-proxy-values.yaml

    helm install -n oauth2-proxy \
      --version 6.0.1 \
      --values ./oauth2-proxy-values.yaml \
      --set config.clientID=$CLIENT_ID \
      --set config.clientSecret=$CLIENT_SECRET \
      --set config.cookieSecret=$COOKIE_SECRET \
      --set extraArgs.oidc-issuer-url=$OIDC_ISSUER_URL \
      --set extraArgs.whitelist-domain=$WEB_HOST \
      oauth2-proxy oauth2-proxy/oauth2-proxy --atomic
}

# ############################################
install_test_app() {
    kubectl create secret docker-registry regcred -n demo --docker-server=registry.mdundek.network --docker-username=mdundek --docker-password=li14ebe14

    cat <<EOF | k3s kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: demo
  labels:
    istio-injection: enabled

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: demo
  labels:
    app: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      imagePullSecrets:
      - name: regcred
      containers:
      - name: nginx
        image: registry.mdundek.network/nginx:1.7.9
        ports:
        - containerPort: 80

---

apiVersion: v1
kind: Service
metadata:
  name: nginx 
  namespace: demo
spec:
  ports:
  - name: http-nginx
    port: 80
  selector:
    app: nginx

---

apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: nginx
  namespace: demo
spec:
  hosts:
  - cs.mdundek.network
  gateways:
  - istio-system/https-gateway
  http:
  - route:
    - destination:
        port:
          number: 80
        host: nginx

---

apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: oidc-test-ra
  namespace: demo
spec:
  jwtRules:
  - issuer: $OIDC_ISSUER_URL
    jwksUri: $OIDC_JWKS_URI
  selector:
    matchLabels:
      app: oidctest

---

apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: oidc-test-ap
  namespace: demo
spec:
  action: CUSTOM
  provider:
    name: oauth2-proxy
  rules:
  - to:
    - operation:
        hosts:
        - "cs.$DOMAIN"
  selector:
    matchLabels:
      app: oidctest
EOF
}

# ############################################
# setup_auth() {
#     cat <<EOF | k3s kubectl apply -f -
# apiVersion: security.istio.io/v1beta1
# kind: RequestAuthentication
# metadata:
#   name: istio-ingressgateway
#   namespace: istio-system
# spec:
#   jwtRules:
#   - issuer: $OIDC_ISSUER_URL
#     jwksUri: $OIDC_JWKS_URI
#   selector:
#     matchLabels:
#       app: istio-ingressgateway
# ---
# apiVersion: security.istio.io/v1beta1
# kind: AuthorizationPolicy
# metadata:
#   name: istio-ingressgateway
#   namespace: istio-system
# spec:
#   action: CUSTOM
#   provider:
#     name: oauth2-proxy
#   rules:
#   - to:
#     - operation:
#         hosts:
#         - "cs.$DOMAIN"
#   selector:
#     matchLabels:
#       app: istio-ingressgateway
# EOF
# }

# ###########################################################################################################################
# ########################################################### MAIN ##########################################################
# ###########################################################################################################################
(
    set -Ee

    function _catch {
        # Rollback
        echo ""
        error "An error occured"
        
    }

    function _finally {
        info "Done!"
    }

    trap _catch ERR
    trap _finally EXIT

    # ############### MAIN ################

    # Google OIDC
    # Client ID:      95386231486-7bic7aa4q0qdub3p5gkr2o9absa384c8.apps.googleusercontent.com
    # Client secret:  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

    DOMAIN="mdundek.network"
    SSL_ROOT=/etc/letsencrypt/live/$DOMAIN

    OIDC_DISCOVERY=$(curl "https://accounts.google.com/.well-known/openid-configuration")
    OIDC_ISSUER_URL=$(echo $OIDC_DISCOVERY | jq -r .issuer)
    OIDC_JWKS_URI=$(echo $OIDC_DISCOVERY | jq -r .jwks_uri) 
    COOKIE_SECRET=$(openssl rand -base64 32 | tr -- '+/' '-_')
    WEB_HOST="cs.$DOMAIN"
    CLIENT_ID="95386231486-7bic7aa4q0qdub3p5gkr2o9absa384c8.apps.googleusercontent.com"
    CLIENT_SECRET="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"

    install_istio

    install_oidc_proxy


)




















cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: code-server
  labels:
    istio-injection: enabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: code-server-proxy
  namespace: code-server
  labels:
    app: code-server-proxy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: code-server-proxy
  template:
    metadata:
      labels:
        app: code-server-proxy
    spec:
      imagePullSecrets:
      - name: regcred
      containers:
      - name: code-server-proxy
        image: registry.$DOMAIN/code-server-nginx:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: code-server-proxy
  namespace: code-server
  labels:
    app: code-server-proxy
spec:
  ports:
  - name: http-code-server-proxy
    port: 80
    targetPort: 80
  selector:
    app: code-server-proxy
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: code-server-proxy
  namespace: code-server
  labels:
    app: code-server-proxy
spec:
  gateways:
  - istio-system/https-gateway
  hosts:
  - cs.$DOMAIN
  http:
  - match:
    - port: 443
    route:
    - destination:
        host: code-server-proxy.code-server.svc.cluster.local
        port:
          number: 80
---
apiVersion: v1
kind: Service
metadata:
  name: codeserver-service-egress
  namespace: code-server
  labels:
    app: code-server
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
  namespace: code-server
  labels:
    app: code-server
subsets:
  - addresses:
    - ip: $LOCAL_IP
    ports:
      - port: 8080
---
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: oidc-code-server-ra
  namespace: code-server
spec:
  jwtRules:
  - issuer: $OIDC_ISSUER_URL
    jwksUri: $OIDC_JWKS_URI
  selector:
    matchLabels:
      app: code-server-proxy
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: oidc-code-server-ap
  namespace: code-server
spec:
  action: CUSTOM
  provider:
    name: oauth2-proxy
  rules:
  - to:
    - operation:
        hosts:
        - "cs.$DOMAIN"
  selector:
    matchLabels:
      app: code-server-proxy
EOF



















