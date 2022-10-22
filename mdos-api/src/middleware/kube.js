const axios = require('axios')
const https = require('https')
const YAML = require('yaml')
const fs = require('fs')
const KubeBase = require('./kubeBase')
const Constants = require('../libs/constants');
const { terminalCommand } = require('../libs/terminal')

axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
})

/**
 * Keycloak specific functions
 *
 * @class Kube
 * @extends {KubeBase}
 */
class Kube extends KubeBase {
    
    /**
     * Creates an instance of Kube.
     * @param {*} app
     * @memberof Kube
     */
    constructor(app) {
        super(app)
    }
    
    /**
     *
     *
     * @return {*} 
     * @memberof Kube
     */
    async getOidcProviders() {
        const istioConfigMap = await this.getConfigMap('istio-system', 'istio')
        const istioMeshYaml = YAML.parse(istioConfigMap.data.mesh)
        return istioMeshYaml.extensionProviders.filter((o) => o.name != 'kc-mdos' && o.name != 'kc-cs')
    }

    /**
     *
     *
     * @param {*} providerName
     * @memberof Kube
     */
    async removeIstioOidcProviders(providerName) {
        try {
            const istioConfigMap = await this.getConfigMap('istio-system', 'istio')

            // Get mesh property from ConfigMap
            const istioMeshYaml = YAML.parse(istioConfigMap.data.mesh)
            // Remove config if present
            istioMeshYaml.extensionProviders = istioMeshYaml.extensionProviders.filter((p) => p.name != providerName)
            // Write back to ConfigMap object
            istioConfigMap.data.mesh = YAML.stringify(istioMeshYaml)

            // Create values.yaml json file
            let valuesManifestJson = {
                meshConfig: {
                    extensionProviders: istioMeshYaml.extensionProviders,
                },
            }

            // Deploy updated istiod
            try {
                fs.writeFileSync('./values.yaml', YAML.stringify(valuesManifestJson))
                await terminalCommand(`${this.HELM_BASE_CMD} upgrade --install istiod ${this.istiodChartPath} -f ./values.yaml -n istio-system --atomic`)
            } finally {
                if (fs.existsSync('./values.yaml')) {
                    fs.rmSync('./values.yaml', { force: true })
                }
            }

            // Restart istiod pod
            try {
                const istioPods = await this.getPods('istio-system')
                const istiodPodName = istioPods.items.find((p) => p.metadata.labels.app == 'istiod').metadata.name
                await this.deletePod('istio-system', istiodPodName)
            } catch (error) {
                throw error
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    /**
     *
     *
     * @param {*} name
     * @memberof Kube
     */
    async addIstiodOidcProvider(name) {
        const istiodData = {
            name: name,
            envoyExtAuthzHttp: {
                headersToDownstreamOnDeny: ['set-cookie', 'content-type'],
                headersToUpstreamOnAllow: ['authorization', 'cookie', 'path', 'x-auth-request-access-token', 'x-auth-request-groups', 'x-auth-request-email', 'x-forwarded-access-token'],
                includeRequestHeadersInCheck: ['cookie', 'x-forwarded-access-token'],
                port: 4180,
                service: `${name}-oauth2-proxy.oauth2-proxy.svc.cluster.local`,
            },
        }

        const istioConfigMap = await this.getConfigMap('istio-system', 'istio')

        // Get mesh property from ConfigMap
        const istioMeshYaml = YAML.parse(istioConfigMap.data.mesh)
        if (!istioMeshYaml.extensionProviders) {
            istioMeshYaml.extensionProviders = []
        }

        // Is this provider already deployed?
        const existingOauthProvider = istioMeshYaml.extensionProviders.find((p) => p.name == istiodData.name)
        if (existingOauthProvider) {
            return
        }

        // Add new config
        istioMeshYaml.extensionProviders.push(istiodData)

        // Create values.yaml json file
        let valuesManifestJson = {
            meshConfig: {
                extensionProviders: istioMeshYaml.extensionProviders,
            },
        }

        // Deploy updated istiod
        try {
            fs.writeFileSync('./values.yaml', YAML.stringify(valuesManifestJson))
            await terminalCommand(`${this.HELM_BASE_CMD} upgrade --install istiod ${this.istiodChartPath} -f ./values.yaml -n istio-system --atomic`)
        } finally {
            if (fs.existsSync('./values.yaml')) {
                fs.rmSync('./values.yaml', { force: true })
            }
        }

        // Restart istiod pod
        try {
            const istioPods = await this.getPods('istio-system')
            const istiodPodName = istioPods.items.find((p) => p.metadata.labels.app == 'istiod').metadata.name
            await this.deletePod('istio-system', istiodPodName)
        } catch (error) {
            throw error
        }
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} name
     * @param {*} clientId
     * @memberof Kube
     */
    async deployKeycloakOauth2Proxy(realm, name, clientId) {
        const realmUrls = await axios.get(`https://keycloak.${this.rootDomain}:${process.env.KC_PORT}/realms/${realm}/.well-known/openid-configuration`)
        const cookieSecret = await terminalCommand("dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d -- '\n' | tr -- '+/' '-_'; echo")
        const clientSecret = await this.app.get('keycloak').getClientSecret(realm, clientId)

        const oauthData = YAML.parse(`service:
    portNumber: 4180
config:
    clientID: "${clientId}"
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
        whitelist_domains = [".${this.rootDomain}"]`)

        // Deploy oauth2-proxy instance for new provider
        if (!(await this.hasNamespace('oauth2-proxy'))) await this.createNamespace({ name: 'oauth2-proxy' })
        await this.helmInstall('oauth2-proxy', name, oauthData, 'oauth2-proxy/oauth2-proxy', '6.2.7')
    }

    /**
     *
     *
     * @param {*} name
     * @param {*} clientId
     * @param {*} clientSecret
     * @param {*} redirectUris
     * @memberof Kube
     */
     async deployGoogleOauth2Proxy(name, clientId, clientSecret, redirectUris) { 
        const realmUrls = await axios.get(`https://accounts.google.com/.well-known/openid-configuration`)
        const cookieSecret = await terminalCommand("dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d -- '\n' | tr -- '+/' '-_'; echo")

        const oauthData = YAML.parse(`service:
    portNumber: 4180
config:
    clientID: "${clientId}"
    clientSecret: "${clientSecret}"
    cookieSecret: "${cookieSecret}"
    cookieName: "_oauth2_proxy"
    configFile: |-
        provider = "oidc"
        oidc_issuer_url="${realmUrls.data.issuer}"
        profile_url="${realmUrls.data.userinfo_endpoint}"
        validate_url="${realmUrls.data.userinfo_endpoint}"
        scope="openid email profile"
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
        whitelist_domains = ${JSON.stringify(redirectUris)}`)
       
        // Deploy oauth2-proxy instance for new provider
        if (!(await this.hasNamespace('oauth2-proxy'))) await this.createNamespace({ 'name': 'oauth2-proxy' })
        await this.helmInstall('oauth2-proxy', name, oauthData, 'oauth2-proxy/oauth2-proxy', '6.2.7')
    }

    /**
     *
     *
     * @param {*} name
     * @memberof Kube
     */
    async uninstallOauth2Proxy(name) {
        await this.helmUninstall('oauth2-proxy', name)
    }

    /**
     * This function will update all namespace user role bindings on kubernetes according to their roles
     */
    async applyUserRoleBindingsForNamespaces() {
        const nsUsersAndRoles = await this.app.get("keycloak").getUsers("mdos")
        // Compute mdos admin emails
        const mdosAdmins = nsUsersAndRoles
            .filter(user => user.clientRoleMappings && user.clientRoleMappings.mdos && user.clientRoleMappings.mdos.mappings
                .find(roleMapping => roleMapping.name == 'admin')
            )
            .map(user => user.email)

        // Collect all namespaces
        let allNamespaces = await this.app.get("kube").getNamespaces()
        allNamespaces = allNamespaces.map(ns => ns.metadata.name).filter(nsName => !Constants.RESERVED_NAMESPACES.includes(nsName))

        // Iterate over namespaces and apply rolebindings on each namespace
        for(const ns of allNamespaces) {
            // Compute namespace admin emails
            let nsKubeAdmins = nsUsersAndRoles
                .filter(user => user.clientRoleMappings && user.clientRoleMappings[ns] && user.clientRoleMappings[ns].mappings
                    .find(roleMapping => roleMapping.name == 'k8s-write')
                )
                .map(user => user.email)
                .filter(email => !mdosAdmins.includes(email))

            // Compute namespace user emails
            const nsKubeUsers = nsUsersAndRoles
                .filter(user => user.clientRoleMappings && user.clientRoleMappings[ns] && user.clientRoleMappings[ns].mappings
                    .find(roleMapping => roleMapping.name == 'k8s-read')
                )
                .map(user => user.email)
                .filter(email => !nsKubeAdmins.includes(email) && !mdosAdmins.includes(email))

            nsKubeAdmins = nsKubeAdmins.concat(mdosAdmins)

            // Update rolebindings for both user types for this namespace 
            await this.applyNamespaceAdminRoleBindings(ns, nsKubeAdmins)
            await this.applyNamespaceUserRoleBindings(ns, nsKubeUsers)
        }
    }

    /**
     * generateUserKubectlCertificates
     * @param {*} username 
     */
    async generateUserKubectlCertificates(username) {
        try {
            await terminalCommand(`openssl ecparam -name prime256v1 -genkey -noout -out /home/node/app/tmp/${username}.key`);
            await terminalCommand(`openssl req -new -key /home/node/app/tmp/${username}.key -out /home/node/app/tmp/${username}.csr -subj "/CN=${username}/O=key-gen"`);
            await terminalCommand(`openssl x509 -req -in /home/node/app/tmp/${username}.csr -CA ${process.env.K3S_CLIENT_CA_PATH} -CAkey ${process.env.K3S_CLIENT_KEY_PATH} -CAcreateserial -out /home/node/app/tmp/${username}.crt -days 500`);

            const key = fs.readFileSync(`/home/node/app/tmp/${username}.key`, {encoding:'utf8', flag:'r'}); 
            const csr = fs.readFileSync(`/home/node/app/tmp/${username}.csr`, {encoding:'utf8', flag:'r'}); 
            const crt = fs.readFileSync(`/home/node/app/tmp/${username}.crt`, {encoding:'utf8', flag:'r'}); 

            return {
                "host": `kubernetes-api.${process.env.ROOT_DOMAIN}:6443`,
                "user": username,
                "key": key,
                "csr": csr,
                "crt": crt
            };
        } 
        catch(error) {
            console.log(error);
            throw error;
        }
        finally {
            try {
                if (fs.existsSync(`/home/node/app/tmp/${username}.key`)) {
                    fs.unlinkSync(`/home/node/app/tmp/${username}.key`);
                }
            } catch(err) {}
            try {
                if (fs.existsSync(`/home/node/app/tmp/${username}.csr`)) {
                    fs.unlinkSync(`/home/node/app/tmp/${username}.csr`);
                }
            } catch(err) {}
            try {
                if (fs.existsSync(`/home/node/app/tmp/${username}.crt`)) {
                    fs.unlinkSync(`/home/node/app/tmp/${username}.crt`);
                }
            } catch(err) {}
        }
    }

    
}

module.exports = Kube
