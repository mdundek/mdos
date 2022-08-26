const axios = require("axios");
const https = require("https");
const YAML = require('yaml');
const fs = require("fs");
const KubeBase = require("./kubeBase");
const { terminalCommand } = require("../libs/terminal");

axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

class Kube extends KubeBase {

    /**
     * constructor
     * @param {*} app 
     */
     constructor(app) {
        super(app);
    }

    /**
     * getOidcProviders
     * @returns 
     */
    async getOidcProviders() {
        const istioConfigMap = await this.getConfigMap("istio-system", "istio");
        const istioMeshYaml = YAML.parse(istioConfigMap.data.mesh);
        return istioMeshYaml.extensionProviders;
    }

    /**
     * addOidcProviders
     * @param {*} data 
     */
    async removeOidcProviders(providerName) {
        try {
            const istioConfigMap = await this.getConfigMap("istio-system", "istio");

            // Get mesh property from ConfigMap
            const istioMeshYaml = YAML.parse(istioConfigMap.data.mesh);
            // Remove config if present
            istioMeshYaml.extensionProviders = istioMeshYaml.extensionProviders.filter(p => p.name != providerName);
            // Write back to ConfigMap object
            istioConfigMap.data.mesh = YAML.stringify(istioMeshYaml);

            // Create values.yaml json file
            let valuesManifestJson = {
                meshConfig: {
                    extensionProviders: istioMeshYaml.extensionProviders
                }
            };

            // Deploy updated istiod
            try {
                fs.writeFileSync('./values.yaml', YAML.stringify(valuesManifestJson));
                await terminalCommand(`${this.HELM_BASE_CMD} upgrade --install istiod ${this.istiodChartPath} -f ./values.yaml -n istio-system --atomic`);
            } finally {
                if (fs.existsSync("./values.yaml")) {
                    fs.unlinkSync("./values.yaml");
                }
            }

            // Restart istiod pod
            try {
                const istioPods = await this.getPods("istio-system");
                const istiodPodName = istioPods.items.find(p => p.metadata.labels.app == "istiod").metadata.name;
                await this.deletePod("istio-system", istiodPodName);
            } catch(error) {
                throw error;
            }
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * addIstiodOidcProvider
     */
    async addIstiodOidcProvider(name) {
        const istiodData = {
            "name": name,
            "envoyExtAuthzHttp": {
                "headersToDownstreamOnDeny": [
                    "set-cookie",
                    "content-type"
                ],
                "headersToUpstreamOnAllow": [
                    "authorization",
                    "cookie",
                    "path",
                    "x-auth-request-access-token",
                    "x-auth-request-groups",
                    "x-auth-request-email",
                    "x-forwarded-access-token"
                ],
                "includeRequestHeadersInCheck": [
                    "cookie",
                    "x-forwarded-access-token"
                ],
                "port": 4180,
                "service": `${name}-oauth2-proxy.oauth2-proxy.svc.cluster.local`
            }
        };

        const istioConfigMap = await this.getConfigMap("istio-system", "istio");

        // Get mesh property from ConfigMap
        const istioMeshYaml = YAML.parse(istioConfigMap.data.mesh);
        if(!istioMeshYaml.extensionProviders) {
            istioMeshYaml.extensionProviders = [];
        }

        // Is this provider already deployed?
        const existingOauthProvider = istioMeshYaml.extensionProviders.find(p => p.name == istiodData.name);
        if(existingOauthProvider) {
            return;
        }
        
        // Add new config
        istioMeshYaml.extensionProviders.push(istiodData);

        // Create values.yaml json file
        let valuesManifestJson = {
            meshConfig: {
                extensionProviders: istioMeshYaml.extensionProviders
            }
        };

        // Deploy updated istiod
        try {
            fs.writeFileSync('./values.yaml', YAML.stringify(valuesManifestJson));
            await terminalCommand(`${this.HELM_BASE_CMD} upgrade --install istiod ${this.istiodChartPath} -f ./values.yaml -n istio-system --atomic`);
        } finally {
            if (fs.existsSync("./values.yaml")) {
                fs.unlinkSync("./values.yaml");
            }
        }

        // Restart istiod pod
        try {
            const istioPods = await this.getPods("istio-system");
            const istiodPodName = istioPods.items.find(p => p.metadata.labels.app == "istiod").metadata.name;
            await this.deletePod("istio-system", istiodPodName);
        } catch(error) {
            throw error;
        }
    }

    /**
     * deployOauth2Proxy
     */
    async deployOauth2Proxy(type, realm, data) {
        if(type == "keycloak") {
            const realmUrls = await axios.get(`https://keycloak.${this.rootDomain}/realms/${realm}/.well-known/openid-configuration`);
            const cookieSecret = await terminalCommand("dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d -- '\n' | tr -- '+/' '-_'; echo");            
            const clientSecret = await this.app.get("keycloak").getClientSecret(realm, data.clientId);
            
            const oauthData = YAML.parse(`service:
    portNumber: 4180
config:
    clientID: "${data.clientId}"
    clientSecret: "${clientSecret}"
    cookieSecret: "${cookieSecret}"
    cookieName: "_oauth2_proxy"
    configFile: |-
        provider = "oidc"
        oidc_issuer_url="${realmUrls.data.issuer}"
        profile_url="${realmUrls.data.userinfo_endpoint}"
        validate_url="${realmUrls.data.userinfo_endpoint}"
        scope="openid email profile roles"
        pass_host_header = true
        reverse_proxy = true
        auth_logging = true
        cookie_httponly = true
        cookie_refresh = "4m"
        cookie_secure = true
        email_domains = "*"
        pass_access_token = true
        pass_authorization_header = true
        request_logging = true
        session_store_type = "cookie"
        set_authorization_header = true
        set_xauthrequest = true
        silence_ping_logging = true
        skip_provider_button = true
        skip_auth_strip_headers = false
        skip_jwt_bearer_tokens = true
        ssl_insecure_skip_verify = true
        standard_logging = true
        upstreams = [ "static://200" ]
        whitelist_domains = [".${this.rootDomain}"]`);

            // Deploy oauth2-proxy instance for new provider
            if(!await this.hasNamespace("oauth2-proxy"))
                await this.createNamespace({name: "oauth2-proxy"});
            await this.helmInstall("oauth2-proxy", data.name, oauthData, "oauth2-proxy/oauth2-proxy", "6.0.1");
        }
    }

    /**
     * uninstallOauth2Proxy
     */
     async uninstallOauth2Proxy(name) {
        await this.helmUninstall("oauth2-proxy", name);
    }
}

module.exports = Kube;