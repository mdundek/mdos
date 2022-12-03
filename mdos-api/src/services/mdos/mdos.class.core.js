const { NotFound, Conflict, Forbidden } = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')
const axios = require('axios')
const CommonCore = require('../common.class.core')

/**
 * MDos core functions class
 *
 * @class KubeCore
 * @extends {CommonCore}
 */
class MdosCore extends CommonCore {
    /**
     * constructor
     * @param {*} app
     */
    constructor(app) {
        super(app)
        this.app = app
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
        }

        // For dev purposes only, used if auth is disabled
        if (process.env.NO_ADMIN_AUTH == 'true') {
            userData.lftpCreds = await this.app.get('kube').getSecret('mdos', `ftpd-${params.namespace}-creds`)
            userData.roles = [`mdostnt-name-${params.namespace}`, 'mdostnt-volume-sync']
            return userData
        }
        // For production
        else {
            if (!headers['authorization']) {
                throw new Forbidden('ERROR: You are not authenticated')
            }

            // Get JWT token
            let access_token = headers['authorization'].split(' ')[1]
            if (access_token.slice(-1) === ';') {
                access_token = access_token.substring(0, access_token.length - 1)
            }
            const jwtToken = await this.app.get('keycloak').userTokenInstrospect('mdos', access_token, true)

            userData.roles = jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles ? jwtToken.resource_access.mdos.roles : []

            for (let ns of allNs) {
                if (params.namespace == ns) {
                    if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.includes('admin')) {
                        userData.lftpCreds = await this.app.get('kube').getSecret('mdos', `ftpd-${params.namespace}-creds`)
                    } else if (jwtToken.resource_access[ns] && jwtToken.resource_access[ns].roles.includes('admin')) {
                        userData.lftpCreds = await this.app.get('kube').getSecret('mdos', `ftpd-${params.namespace}-creds`)
                    } else if (jwtToken.resource_access[ns] && jwtToken.resource_access[ns].roles.includes('ftp-write')) {
                        userData.lftpCreds = await this.app.get('kube').getSecret('mdos', `ftpd-${params.namespace}-creds`)
                    }
                }
            }
            return userData
        }
    }

    /**
     * validateNamespaceForDeployment
     * @param {*} valuesYaml
     */
    async validateNamespaceForDeployment(valuesYaml) {
        // Create namespace if not exist
        const nsFound = await this.app.get('kube').hasNamespace(valuesYaml.tenantName)
        if (!nsFound) {
            throw new NotFound(`ERROR: The namespace "${valuesYaml.tenantName}" does not exist. You need to create it first using the command: mdos namespace create`)
        }
        // If namespace exist, make sure it has the required mdos secrets
        else {
            // If at least one component does not have an imagePullSecret, we need our private reg pull secret in this namespace
            if (valuesYaml.components.find((component) => !component.imagePullSecrets && !component.publicRegistry)) {
                const regCredsFound = await this.app.get('kube').hasSecret(valuesYaml.tenantName, 'mdos-regcred')
                if (!regCredsFound) {
                    throw new Conflict("ERROR: The target namespace seems to be missing the secret named 'mdos-regcred'")
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
        if(!this.app.get("mdos_framework_only")) {
            // Specify registry for init containers
            valuesYaml.registry = `registry.${process.env.ROOT_DOMAIN}`
            valuesYaml.mdosRegistry = `registry.${process.env.ROOT_DOMAIN}`
        } else {
            valuesYaml.ingressClassName = "istio"
        }

        // Set default storage class if not set for volumes when deploying in framework only mode
        if(this.app.get("mdos_framework_only")) {
            const clusterStorageClasses = await this.app.get('kube').getStorageClasses()
            let defaultClass = clusterStorageClasses.find(sc => sc.metadata.annotations && sc.metadata.annotations["storageclass.kubernetes.io/is-default-class"])
            if(!defaultClass) defaultClass = clusterStorageClasses[0]
            for (const component of valuesYaml.components) {
                if(component.volumes) {
                    for (const volume of component.volumes) {
                        if(!volume.storageClass) volume.storageClass = defaultClass.metadata.name
                    }
                }
            }
        }

        // If sync volumes, make sure we have a ftpd secret
        if (valuesYaml.components.find((component) => (component.volumes ? component.volumes.find((v) => v.syncVolume) : false))) {
            valuesYaml.ftpCredentials = await this.app.get('kube').getSecret('mdos', `ftpd-${valuesYaml.tenantName.toLowerCase()}-creds`)
        }

        // Iterate over components and process one by one
        for (const component of valuesYaml.components) {
            // Add registry credentials if necessary
            if (!this.app.get("mdos_framework_only") && !component.imagePullSecrets && !component.publicRegistry) {
                // MDos registry target, append namespace name to image path
                if (component.image.indexOf('/') == 0) component.image = `${valuesYaml.tenantName}${component.image}`
                else component.image = `${valuesYaml.tenantName}/${component.image}`
                // Skip images from public registries or with specific secrets
                component.imagePullSecrets = [
                    {
                        name: 'mdos-regcred',
                    },
                ]
            }

            if (this.app.get("mdos_framework_only")) valuesYaml.frameworkMode = true

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
            if (!this.app.get("mdos_framework_only") && component.oidc && component.oidc.provider) {
                const oidcProvider = await this.app.get('kube').getOidcProviders()
                const targetProvider = oidcProvider.find((p) => p.name == component.oidc.provider)
                if (!targetProvider) {
                    throw new NotFound(`ERROR: OIDC Provider "${component.oidc.provider}" not found. It needs to be created first using the command 'mdos oidc add'.`)
                }
                if (component.oidc.provider.indexOf('kc-') == 0) {
                    const oidcLinks = await axios.get(`https://keycloak.${process.env.ROOT_DOMAIN}:${process.env.KC_PORT}/realms/mdos/.well-known/openid-configuration`)
                    component.oidc.issuer = oidcLinks.data.issuer
                    component.oidc.jwksUri = oidcLinks.data.jwks_uri
                } else if (component.oidc.provider.indexOf('google-') == 0) {
                    const oidcLinks = await axios.get(`https://accounts.google.com/.well-known/openid-configuration`)
                    component.oidc.issuer = oidcLinks.data.issuer
                    component.oidc.jwksUri = oidcLinks.data.jwks_uri
                } else {
                    throw new Error('ERROR: Provider not supported')
                }
            }

            // Set default ingress type if not set
            if (component.ingress) {
                component.ingress = component.ingress.map((i) => {
                    if(i.matchHost.startsWith(".")) i.matchHost = `*${i.matchHost}` // normalize
                    if (!i.trafficType) i.trafficType = 'http'
                    return i
                })

                if(!this.app.get("mdos_framework_only")) {
                    // Set associated gateways
                    const hostMatrix = await this.app.get("kube").generateIngressGatewayDomainMatrix(component.ingress.map((ingress) => ingress.matchHost))
                    // console.log(JSON.stringify(hostMatrix, null, 4))
                    let ingressInUseErrors = []
                    let ingressMissingErrors = []
                    component.ingress = component.ingress.map((ingress) => {
                        let gtwConfigured = false
                        if(ingress.trafficType == "http") {
                            const httpGatewayFound = this.app.get("kube").ingressGatewayTargetFound(hostMatrix, "HTTP")
                            const httpsTerminateGatewayFound = this.app.get("kube").ingressGatewayTargetFound(hostMatrix, "HTTPS_SIMPLE")
                            gtwConfigured = httpGatewayFound[ingress.matchHost] || httpsTerminateGatewayFound[ingress.matchHost]
                        } else {
                            const httpsPassthroughGatewayFound = this.app.get("kube").ingressGatewayTargetFound(hostMatrix, "HTTPS_PASSTHROUGH")
                            gtwConfigured = httpsPassthroughGatewayFound[ingress.matchHost]
                        }

                        // If not available for any gateway config, then it means that we have a match
                        if(gtwConfigured) {
                            let targetGtws = []

                            if(ingress.trafficType == "http" && hostMatrix[ingress.matchHost]["HTTP"].match == "EXACT" && [valuesYaml.tenantName, "mdos"].includes(hostMatrix[ingress.matchHost]["HTTP"].gtw.metadata.namespace)) {
                                targetGtws.push(hostMatrix[ingress.matchHost]["HTTP"].gtw)
                            } else if(ingress.trafficType == "http" && hostMatrix[ingress.matchHost]["HTTP"].match == "WILDCARD" && [valuesYaml.tenantName, "mdos"].includes(hostMatrix[ingress.matchHost]["HTTP"].gtw.metadata.namespace)) {
                                targetGtws.push(hostMatrix[ingress.matchHost]["HTTP"].gtw)
                            }

                            if(ingress.trafficType == "http" && hostMatrix[ingress.matchHost]["HTTPS_SIMPLE"].match == "EXACT" && [valuesYaml.tenantName, "mdos"].includes(hostMatrix[ingress.matchHost]["HTTPS_SIMPLE"].gtw.metadata.namespace)) {
                                targetGtws.push(hostMatrix[ingress.matchHost]["HTTPS_SIMPLE"].gtw)
                            } else if(ingress.trafficType == "http" && hostMatrix[ingress.matchHost]["HTTPS_SIMPLE"].match == "WILDCARD" && [valuesYaml.tenantName, "mdos"].includes(hostMatrix[ingress.matchHost]["HTTPS_SIMPLE"].gtw.metadata.namespace)) {
                                targetGtws.push(hostMatrix[ingress.matchHost]["HTTPS_SIMPLE"].gtw)
                            } 

                            if(ingress.trafficType == "https" && hostMatrix[ingress.matchHost]["HTTPS_PASSTHROUGH"].match == "EXACT" && [valuesYaml.tenantName, "mdos"].includes(hostMatrix[ingress.matchHost]["HTTPS_PASSTHROUGH"].gtw.metadata.namespace)) {
                                targetGtws.push(hostMatrix[ingress.matchHost]["HTTPS_PASSTHROUGH"].gtw)
                            } else if(ingress.trafficType == "https" && hostMatrix[ingress.matchHost]["HTTPS_PASSTHROUGH"].match == "WILDCARD" && [valuesYaml.tenantName, "mdos"].includes(hostMatrix[ingress.matchHost]["HTTPS_PASSTHROUGH"].gtw.metadata.namespace)) {
                                targetGtws.push(hostMatrix[ingress.matchHost]["HTTPS_PASSTHROUGH"].gtw)
                            }
                            if(targetGtws.length == 0) {
                                ingressInUseErrors.push({
                                    type: ingress.trafficType,
                                    host: ingress.matchHost
                                })
                            } else {
                                ingress.gateways = [...new Set(targetGtws.map(gtw => `${gtw.metadata.namespace}/${gtw.metadata.name}`))]  // filter out duplicates
                            }
                        } else {
                            ingressMissingErrors.push({
                                type: ingress.trafficType,
                                host: ingress.matchHost
                            })
                        }
                        return ingress
                    })
                
                    let errorMsgs = []
                    if(ingressInUseErrors.length > 0) {
                        errorMsgs = errorMsgs.concat(ingressInUseErrors.map(error => `Ingress gateway found that can handle ${error.type} traffic for domain name "${error.host}", but the gateway belongs to another namespace`))
                    }
                    if(ingressMissingErrors.length > 0) {
                        errorMsgs = errorMsgs.concat(ingressMissingErrors.map(error => `No ingress gateway found that can handle ${error.type} traffic for domain name "${error.host}"`))
                    }
                    
                    if(errorMsgs.length > 0)
                        throw new Conflict(`ERROR: ${errorMsgs.join("\n")}`)
                }
            }

            // Set component details for networkPolicy limited
            if (component.networkPolicy && component.networkPolicy.scope == "limited") {
                component.networkPolicy.allow = valuesYaml.components.filter(_c => _c.uuid != component.uuid).map(_c => {
                    return {
                        namespace: valuesYaml.tenantName,
                        appUuid: valuesYaml.uuid,
                        compUuid: _c.uuid
                    }
                })
            }
        }

        return valuesYaml
    }
}

module.exports = MdosCore
