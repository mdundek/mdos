const { NotFound, Conflict, Unavailable, Forbidden } = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')
const axios = require('axios')
const CommonCore = require('../common.class.core');

class MdosCore extends CommonCore {

    /**
     * constructor
     * @param {*} app 
     */
    constructor(app) {
        super(app);
        this.app = app;
    }

    /**
     * computeUserInfo
     * @param {*} headers 
     * @param {*} params 
     * @returns 
     */
    async computeUserInfo(headers, params) {
        let allNs = await this.app.get('kube').getNamespaces()
        allNs = allNs.map((o) => o.metadata.name)

        const userData = {
            registry: `registry.${process.env.ROOT_DOMAIN}`,
            registryUser: process.env.REG_USER,
            registryPassword: process.env.REG_PASS,
            S3Provider: process.env.S3_PROVIDER,
            s3: [],
        }

        // For dev purposes only, used if auth is disabled
        if (process.env.NO_ADMIN_AUTH == 'true') {
            for (let ns of allNs) {
                const s3creds = await this.app.get('s3').getNamespaceCredentials(ns, 'write')
                if (s3creds) {
                    s3creds.bucket = ns
                    s3creds.permissions = 'write'
                    userData.s3.push(s3creds)
                }
            }
            userData.roles = [`mdostnt-name-${params.tenantName}`, 'mdostnt-volume-sync']
            return userData
        }
        // For production
        else {
            if (!headers['x-auth-request-access-token']) {
                throw new Forbidden('You are not authenticated')
            }

            let jwtToken = jwt_decode(headers['x-auth-request-access-token'])
            userData.roles = jwtToken.resource_access.mdos.roles

            for (let ns of allNs) {
                if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.includes('admin')) {
                    const s3creds = await this.app.get('s3').getNamespaceCredentials(ns, 'write')
                    if (s3creds) {
                        s3creds.bucket = ns
                        s3creds.permissions = 'write'
                        userData.s3.push(s3creds)
                    }
                } else if (jwtToken.resource_access[ns] && jwtToken.resource_access[ns].roles.includes('admin')) {
                    const s3creds = await this.app.get('s3').getNamespaceCredentials(ns, 'write')
                    if (s3creds) {
                        s3creds.bucket = ns
                        s3creds.permissions = 'write'
                        userData.s3.push(s3creds)
                    }
                } else if (jwtToken.resource_access[ns] && jwtToken.resource_access[ns].roles.includes('s3-write')) {
                    const s3creds = await this.app.get('s3').getNamespaceCredentials(ns, 'write')
                    if (s3creds) {
                        s3creds.bucket = ns
                        s3creds.permissions = 'write'
                        userData.s3.push(s3creds)
                    }
                } else if (jwtToken.resource_access[ns] && jwtToken.resource_access[ns].roles.includes('s3-read')) {
                    const s3creds = await this.app.get('s3').getNamespaceCredentials(ns, 'read')
                    if (s3creds) {
                        s3creds.bucket = ns
                        s3creds.permissions = 'read'
                        userData.s3.push(s3creds)
                    }
                }
            }
            return userData
        }
    }

    /**
     * prepareNamespaceForDeployment
     * @param {*} valuesYaml 
     */
    async prepareNamespaceForDeployment(valuesYaml) {
        // Create namespace if not exist
        const nsFound = await this.app.get('kube').hasNamespace(valuesYaml.tenantName)
        if (!nsFound) {
            throw new NotFound("The target namespace does not exist. You need to create it first using the command: mdos namespace create")
        }
        // If namespace exist, make sure it has the required mdos secrets
        else {
            // If at least one component does not have an imagePullSecret, we need our private reg pull secret in this namespace
            if (valuesYaml.components.find((component) => !component.imagePullSecrets && !component.publicRegistry)) {
                const regCredsFound = await this.app.get('kube').hasSecret(valuesYaml.tenantName, 'mdos-regcred')
                if (!regCredsFound) {
                    throw new Conflict("The target namespace seems to be missing the secret named 'mdos-regcred'")
                }
            }

            // If sync volues , make sure we have a minio secret
            if (valuesYaml.components.find((component) => component.volumes.find((v) => v.syncVolume))) {
                const minioCredsFound = await this.app.get('kube').hasSecret(valuesYaml.tenantName, 's3-read')
                if (!minioCredsFound) {
                    throw new Conflict("The target namespace seems to be missing the secret named 's3-read'")
                }
            }
        }
    }

    /**
     * enrichValuesForDeployment
     * @param {*} valuesYaml 
     * @returns 
     */
    async enrichValuesForDeployment(valuesYaml) {
        // Specify registry for init containers
        valuesYaml.registry = `registry.${process.env.ROOT_DOMAIN}`
        valuesYaml.mdosRegistry = `registry.${process.env.ROOT_DOMAIN}`

        // Iterate over components and proces one by one
        for (const component of valuesYaml.components) {
            // Add registry credentials if necessary
            if (!component.imagePullSecrets && !component.publicRegistry) {
                // Skip images from public registries or with specific secrets
                component.imagePullSecrets = [
                    {
                        name: 'mdos-regcred',
                    },
                ]
            }

            // Set port names
            if (component.services) {
                component.services = component.services.map((s) => {
                    s.ports = s.ports.map((p) => {
                        p.name = `http-${p.port}`
                        return p
                    })
                    return s
                })
            }

            // Resolve OIDC details
            if (component.oidc && component.oidc.provider) {
                const oidcProvider = await this.app.get('kube').getOidcProviders()
                const targetProvider = oidcProvider.find((p) => p.name == component.oidc.provider)
                if (!targetProvider) {
                    throw new NotFound('Provider not found')
                }
                if (component.oidc.provider.indexOf('kc-') == 0) {
                    const oidcLinks = await axios.get(`https://keycloak.${process.env.ROOT_DOMAIN}/realms/mdos/.well-known/openid-configuration`)
                    component.oidc.issuer = oidcLinks.data.issuer
                    component.oidc.jwksUri = oidcLinks.data.jwks_uri
                } else {
                    throw new Unavailable('Provider not supported')
                }
            }
        }

        return valuesYaml;
    }
}

module.exports = MdosCore
