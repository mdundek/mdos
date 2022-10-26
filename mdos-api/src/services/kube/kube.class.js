const { NotFound, BadRequest, Forbidden } = require('@feathersjs/errors')
const nanoid_1 = require('nanoid')
const nanoid = (0, nanoid_1.customAlphabet)('1234567890abcdefghijklmnopqrstuvwxyz', 10)
const KubeCore = require('./kube.class.core')
const { CHANNEL } = require('../../middleware/rb-broker/constant');
const YAML = require('yaml')

/* eslint-disable no-unused-vars */
exports.Kube = class Kube extends KubeCore {

    /**
     * Creates an instance of Kube.
     * @param {*} options
     * @param {*} app
     */
    constructor(options, app) {
        super(app)
        this.options = options || {}
        this.app = app
    }

    /**
     * Find
     *
     * @param {*} params
     * @param {*} context
     * @return {*} 
     */
    async find(params, context) {
        /******************************************
         *  LOOKUP NAMESPACES
         ******************************************/
        if (params.query.target == 'namespaces') {
            const nsListEnriched = await this.getEnrichedNamespaces(params.query.realm, params.query.includeKcClients)
            return nsListEnriched
        }
        /******************************************
         *  LOOKUP INGRESS GATEWAYS
         ******************************************/
        else if (params.query.target == 'gateways') {
            let gateways = await this.app.get('kube').getIstioGateways(params.query.namespace ? params.query.namespace : "", params.query.name ? params.query.name : false)
            if(params.query.host)
                return this.app.get('gateways').findMatchingGateways(gateways, params.query.host)
            else
                return gateways
        }
        /******************************************
         *  LOOKUP CERTIFICATES
         ******************************************/
        else if (params.query.target == 'certificates') {
            let certificates = await this.app.get('kube').getCertManagerCertificates(params.query.namespace ? params.query.namespace : "", params.query.name ? params.query.name : false)
            if(params.query.hosts)
                return this.app.get('certificates').findMatchingCertificates(certificates, JSON.parse(params.query.hosts))
            else
                return certificates
        }
        /******************************************
         *  LOOKUP TLS SECRETS
         ******************************************/
         else if (params.query.target == 'tls-secrets') {
            let secrets = await this.app.get('kube').getTlsSecrets(params.query.namespace ? params.query.namespace : "", params.query.name ? params.query.name : false)
            return secrets
        }
        /******************************************
         *  LOOKUP CERT-MANAGER ISSUERS
         ******************************************/
         else if (params.query.target == 'cm-issuers') {
            let issuers = await this.app.get('kube').getCertManagerIssuers(params.query.namespace ? params.query.namespace : "", params.query.name ? params.query.name : false)
            return issuers
        }
        else if (params.query.target == 'cm-cluster-issuers') {
            let issuers = await this.app.get('kube').getCertManagerClusterIssuers(params.query.name ? params.query.name : false)
            return issuers
        }
        /******************************************
         *  LOOKUP NAMESPACE APPLICATIONS
         ******************************************/
        else if (params.query.target == 'applications') {
            // Make sure namespace exists
            if (!(await this.app.get('kube').hasNamespace(params.query.clientId))) {
                throw new NotFound('ERROR: Namespace does not exist')
            }
            let nsApps = await this.getMdosApplications(params.query.clientId)
            return nsApps
        } 
        /******************************************
        *  GENERATE USER KUBECTL CERTIFICATE
        ******************************************/
        else if (params.query.target == 'kubeconfig') {
            // Get JWT token
            let access_token = params.headers.authorization.split(" ")[1]
            if (access_token.slice(-1) === ';') {
                access_token = access_token.substring(0, access_token.length-1)
            }
            const jwtToken = await this.app.get('keycloak').userTokenInstrospect('mdos', access_token, true)
            if(!jwtToken.active) {
                throw new Forbidden('ERROR: Authentication session timeout')
            }
            const certData = await this.app.get('kube').generateUserKubectlCertificates(jwtToken.email)
            return certData
        } else {
            throw new BadRequest('ERROR: Malformed API request')
        }
    }

    /**
     * Create
     *
     * @param {*} data
     * @param {*} params
     * @return {*} 
     */
    async create(data, params) {
        /******************************************
         *  CREATE / UPDATE SECRET
         ******************************************/
        if (data.type == 'secret') {
            if (await this.app.get('kube').hasSecret(data.namespace, data.name)) {
                await this.app.get('kube').replaceSecret(data.namespace, data.name, data.data)
            } else {
                await this.app.get('kube').createSecret(data.namespace, data.name, data.data)
            }
        } 
        /******************************************
         *  CREATE CERT MANAGER ISSUER
         ******************************************/
        else if (data.type == 'cm-issuer' || data.type == 'cm-cluster-issuer') {
            let yamlBlockArray = data.issuerYaml.split("---")
            let issuerBlock = null
            try {
                // Parse blocks and identify issuer
                for(let i=0; i<yamlBlockArray.length; i++) {
                    yamlBlockArray[i] = YAML.parse(yamlBlockArray[i])
                    if(yamlBlockArray[i].kind && (yamlBlockArray[i].kind == "Issuer" || yamlBlockArray[i].kind == "ClusterIssuer") && yamlBlockArray[i].metadata && yamlBlockArray[i].metadata.name) {
                        issuerBlock = yamlBlockArray[i]
                    }
                }
            } catch (error) {
                console.log(error)
                throw new BadRequest('ERROR: The YAML file could not be parsed. Make sur it is valid YAML.')
            }

            // No Issuer kind found
            if(!issuerBlock) {
                throw new BadRequest('ERROR: The provided yaml file does not seem to be of kind "Issuer".')
            }

            // Make sure Issuer is what request is about
            if(issuerBlock.kind.toLowerCase() == "issuer" && data.type == 'cm-cluster-issuer') {
                throw new BadRequest('ERROR: Wrong Issuer Kind.')
            }

            /**
             * Rollback function 
             */
            const rollbackDeployment = async () => {
                for(let i=0; i<yamlBlockArray.length; i++) {
                    if(yamlBlockArray[i].kind) {
                        if(yamlBlockArray[i].kind == "Issuer") {
                            try {
                                await this.app.get("kube").kubectlDelete(data.namespace, YAML.stringify(yamlBlockArray[i]))
                            } catch (_e) {}
                        } else if (yamlBlockArray[i].kind == "ClusterIssuer") {
                            try {
                                await this.app.get("kube").kubectlDelete(null, YAML.stringify(yamlBlockArray[i]))
                            } catch (_e) {}
                        } else {
                            try {
                                await this.app.get("kube").kubectlDelete(yamlBlockArray[i].metadata.namespace && yamlBlockArray[i].metadata.namespace == "cert-manager" ? "cert-manager" : data.namespace ? data.namespace : null, YAML.stringify(yamlBlockArray[i]))
                            } catch (_e) {}
                        }
                    }
                }
            }

            // Deploy
            try {
                for(let i=0; i<yamlBlockArray.length; i++) {
                    if(yamlBlockArray[i].kind) {
                        if(yamlBlockArray[i].kind == "Issuer") {
                            await this.app.get("kube").kubectlApply(data.namespace, YAML.stringify(yamlBlockArray[i]))
                        } else if (yamlBlockArray[i].kind == "ClusterIssuer") {
                            await this.app.get("kube").kubectlApply(null, YAML.stringify(yamlBlockArray[i]))
                        } else {
                            await this.app.get("kube").kubectlApply(yamlBlockArray[i].metadata.namespace && yamlBlockArray[i].metadata.namespace == "cert-manager" ? "cert-manager" : data.namespace ? data.namespace : null, YAML.stringify(yamlBlockArray[i]))
                        }
                    }
                }
            } catch (error) {
                console.log(error)
                // Rollback, just in case there aresome residual components that got deployed
                await rollbackDeployment()
                throw error
            }

            // Monitor status until success or fail
            let attempts = 0
            let ready = false
            try {
                while(true) {
                    let issuerDetails
                    if(issuerBlock.kind == "ClusterIssuer") {
                        issuerDetails = await this.app.get('kube').getCertManagerClusterIssuers(issuerBlock.metadata.name)
                    } else {
                        issuerDetails = await this.app.get('kube').getCertManagerIssuers(data.namespace, issuerBlock.metadata.name)
                    }

                    if(issuerDetails.length == 1 && issuerDetails[0].status) {
                        if(issuerDetails[0].status.conditions.find(condition => condition.status == "True" && condition.type == "Ready")) {
                            ready = true
                            break
                        }
                    }
                    if(attempts == 10) break
                    attempts++
                    await new Promise(r => setTimeout(r, 1000));
                }
                if(!ready) {
                    // Rollback
                    await rollbackDeployment()
                    throw new BadRequest('ERROR: Issuer does not seem to become ready')
                }
                return data
            } catch (error) {
                console.log(error)
                await rollbackDeployment()
                throw error
            }
        } 
        /******************************************
         *  CREATE CERT MANAGER CERTIFICATE
         ******************************************/
        else if (data.type == 'cm-certificate') {
            // Create certificate
            await this.app.get('kube').createCertManagerCertificate(data.namespace, data.name, data.hosts, data.issuerName, data.isClusterIssuer)
            return data
        }
        /******************************************
         *  CREATE INGRESS GATEWAY
         ******************************************/
         else if (data.type == 'ingress-gateway') {
            // Check if namespace gateway exists (name: mdos-ns-gateway).
            const nsGateway = await this.app.get('kube').getIstioGateways(data.namespace, "mdos-ns-gateway")

            // New gateway
            if(nsGateway.length == 0) {
                if(data.trafficType == "HTTPS_SIMPLE") {
                    await this.app.get('kube').createIstioGateway(data.namespace, "mdos-ns-gateway", [{
                        hosts: data.hosts,
                        port: {
                            name: `https-${nanoid(10)}`,
                            number: 443,
                            protocol: "HTTPS"
                        },
                        tls: {
                            credentialName: data.tlsSecretName,
                            mode: "SIMPLE"
                        }
                    }])
                } else if(data.trafficType == "HTTPS_PASSTHROUGH") {
                    await this.app.get('kube').createIstioGateway(data.namespace, "mdos-ns-gateway", [{
                        hosts: data.hosts,
                        port: {
                            name: `https-${nanoid(10)}`,
                            number: 443,
                            protocol: "HTTPS"
                        },
                        tls: {
                            mode: "PASSTHROUGH"
                        }
                    }])
                } else {
                    await this.app.get('kube').createIstioGateway(data.namespace, "mdos-ns-gateway", [{
                        hosts: data.hosts,
                        port: {
                            name: `http-${nanoid(10)}`,
                            number: 80,
                            protocol: "HTTP"
                        }
                    }])
                }
            } 
            // Existing gateway
            else {
                if(data.trafficType == "HTTPS_SIMPLE") {
                    nsGateway[0].spec.servers.push({
                        hosts: data.hosts,
                        port: {
                            name: `https-${nanoid(10)}`,
                            number: 443,
                            protocol: "HTTPS"
                        },
                        tls: {
                            credentialName: data.tlsSecretName,
                            mode: "SIMPLE"
                        }
                    })
                } else if(data.trafficType == "HTTPS_PASSTHROUGH") {
                    nsGateway[0].spec.servers.push({
                        hosts: data.hosts,
                        port: {
                            name: `https-${nanoid(10)}`,
                            number: 443,
                            protocol: "HTTPS"
                        },
                        tls: {
                            mode: "PASSTHROUGH"
                        }
                    })
                } else {
                    nsGateway[0].spec.servers.push({
                        hosts: data.hosts,
                        port: {
                            name: `http-${nanoid(10)}`,
                            number: 80,
                            protocol: "HTTP"
                        }
                    })
                }
                
                await this.app.get('kube').updateIstioGateway(data.namespace, "mdos-ns-gateway", nsGateway[0].metadata.resourceVersion, nsGateway[0].spec.servers)
            }
        }
        /******************************************
         *  CREATE NEW TENANT NAMESPACE
         ******************************************/
        else if (data.type == 'tenantNamespace') {
            // Make sure keycloak is deployed
            await this.keycloakInstallCheck()

            // Make sure realm exists
            await this.realmCheck(data.realm)

            // Make sure client ID does not exist
            await this.clientDoesNotExistCheck(data.realm, data.namespace)

            const saUser = nanoid().toLowerCase()
            const saPass = nanoid().toLowerCase()

            // Kick off event driven workflow
            const result = await this.app.get('subscriptionManager').workflowCall(CHANNEL.JOB_K3S_CREATE_NAMESPACE, {
                context: {
                    namespace: data.namespace,
                    realm: data.realm,
                    registryUser: saUser,
                    registryPass: saPass,
                    kcSaUser: saUser,
                    kcSaPass: saUser,
                    rollback: false
                },
                workflow: [
                    {
                        topic: CHANNEL.JOB_K3S_CREATE_NAMESPACE,
                        status: "PENDING",
                        milestone: 1
                    },
                    {
                        topic: CHANNEL.JOB_KC_CREATE_CLIENT,
                        status: "PENDING",
                        milestone: 2
                    },
                    {
                        topic: CHANNEL.JOB_KC_CREATE_CLIENT_ROLES,
                        status: "PENDING"
                    },
                    {
                        topic: CHANNEL.JOB_FTPD_CREATE_CREDENTIALS,
                        status: "PENDING",
                        milestone: 3
                    },
                    {
                        topic: CHANNEL.JOB_KC_CREATE_CLIENT_SA,
                        status: "PENDING",
                        milestone: 4
                    },
                    {
                        topic: CHANNEL.JOB_K3S_CREATE_REG_SECRET,
                        status: "PENDING"
                    },
                    {
                        topic: CHANNEL.JOB_K3S_APPLY_USR_ROLE_BINDINGS,
                        status: "PENDING"
                    }
                ],
                rollbackWorkflow: [
                    {
                        topic: CHANNEL.JOB_KC_DELETE_CLIENT_SA,
                        status: "PENDING",
                        milestone: 4
                    },
                    {
                        topic: CHANNEL.JOB_FTPD_DELETE_CREDENTIALS,
                        status: "PENDING",
                        milestone: 3
                    },
                    {
                        topic: CHANNEL.JOB_KC_DELETE_CLIENT,
                        status: "PENDING",
                        milestone: 2
                    },
                    {
                        topic: CHANNEL.JOB_K3S_DELETE_NAMESPACE,
                        status: "PENDING",
                        milestone: 1
                    }
                ]
            })

            // Check if error occured or not
            if(result.context.rollback) {
                console.error(result.workflow)
                const errorJob = result.workflow.find(job => job.status  == "ERROR")
                if(errorJob && errorJob.errorMessage) {
                    throw new Error("ERROR: " + errorJob.errorMessage)
                } else {
                    throw new Error("ERROR: An unknown error occured")
                }
            }
        }
        /******************************************
         *  VALIDATE GATEWAY AVAILABLE HOSTS
         ******************************************/
        else if (data.type == 'validate-ingress-gtw-hosts') {
            const matrix = await this.app.get("kube").generateIngressGatewayDomainMatrix(data.hosts)
            return {
                matrix: matrix,
                available: this.app.get("kube").ingressGatewayTargetAvailable(matrix, data.trafficType)
            }
        }
        // ****************************************
        else {
            throw new BadRequest('ERROR: Malformed API request')
        }
        return data
    }

    /**
     * Remove
     *
     * @param {*} id
     * @param {*} params
     * @return {*} 
     */
    async remove(id, params) {
        /******************************************
         *  DELETE TENANT NAMESPACE
         ******************************************/
        if (params.query.target == 'tenantNamespace') {
            // Make sure keycloak is deployed
            await this.keycloakInstallCheck()

            // Make sure realm exists
            await this.realmCheck(params.query.realm)

            // Make sure namespace exists
            if (!(await this.app.get('kube').hasNamespace(id.toLowerCase()))) {
                throw new Error("ERROR: Namespace not found")
            }

            // Kick off event driven workflow
            const result = await this.app.get('subscriptionManager').workflowCall(CHANNEL.JOB_K3S_DELETE_NAMESPACE, {
                context: {
                    namespace: id,
                    realm: params.query.realm,
                    rollback: false
                },
                workflow: [
                    {
                        topic: CHANNEL.JOB_K3S_DELETE_NAMESPACE,
                        status: "PENDING",
                        milestone: 1
                    },
                    {
                        topic: CHANNEL.JOB_KC_DELETE_CLIENT_SA,
                        status: "PENDING",
                        milestone: 2
                    },
                    {
                        topic: CHANNEL.JOB_KC_DELETE_CLIENT,
                        status: "PENDING",
                        milestone: 3
                    },
                    {
                        topic: CHANNEL.JOB_FTPD_DELETE_CREDENTIALS,
                        status: "PENDING",
                        milestone: 4
                    }
                ],
                rollbackWorkflow: []
            })

            // Check if error occured or not
            if(result.context.rollback) {
                console.error(result.workflow)
                const errorJob = result.workflow.find(job => job.status  == "ERROR")
                if(errorJob && errorJob.errorMessage) {
                    throw new Error("ERROR: " + errorJob.errorMessage)
                } else {
                    throw new Error("ERROR: An unknown error occured")
                }
            }
        }
        /******************************************
         *  UNINSTALL / DELETE APPLICATION
         ******************************************/
        else if (params.query.target == 'application') {
            // Make sure namespace exists
            if (!(await this.app.get('kube').hasNamespace(params.query.clientId))) {
                throw new NotFound('ERROR: Namespace does not exist')
            }
            await this.deleteApplication(params.query.clientId, id, params.query.isHelm == 'true', params.query.type)
        } 
        /******************************************
         *  UNINSTALL / DELETE ISSUER
         ******************************************/
        else if (params.query.target == 'cm-issuer') {
            await this.app.get("kube").deleteCertManagerIssuer(params.query.namespace, id)
        }
        else if (params.query.target == 'cm-cluster-issuer') {
            await this.app.get("kube").deleteCertManagerClusterIssuer(id)
        }
        /******************************************
         *  UNINSTALL / DELETE CERTIFICATE
         ******************************************/
         else if (params.query.target == 'certificate') {
            await this.app.get("kube").deleteCertManagerCertificate(params.query.namespace, id)
            const hasSecret = await this.app.get('kube').hasSecret(params.query.namespace, id)
            if(hasSecret) {
                await this.app.get('kube').deleteSecret(params.query.namespace, id)
            }
        }
        /******************************************
         *  UNINSTALL / DELETE CERTIFICATE
         ******************************************/
        else if (params.query.target == 'ingress-gateway') {
            // Check if namespace gateway exists (name: mdos-ns-gateway).
            const nsGateway = await this.app.get('kube').getIstioGateways(params.query.namespace, "mdos-ns-gateway")

            // Validation
            if(nsGateway.length == 0) {
                throw new NotFound('ERROR: Namespace ingress gateway does not exist')
            }
            const index = Number(id);
            if (Number.isInteger(index) && index <=0) throw new BadRequest("Number (integer) expected")
            else if (index <=0 || index > nsGateway[0].spec.servers.length) throw new BadRequest("Index out of range")

            // Filter out config
            nsGateway[0].spec.servers.splice(index - 1, 1)

            if(nsGateway[0].spec.servers.length == 0) {
                // Delete gateway
                await this.app.get('kube').deleteIstioGateway(params.query.namespace, "mdos-ns-gateway")
            } else {
                // Update gateway
                await this.app.get('kube').updateIstioGateway(params.query.namespace, "mdos-ns-gateway", nsGateway[0].metadata.resourceVersion, nsGateway[0].spec.servers)
            }
        }
        // ***************************************
        else {
            throw new BadRequest('ERROR: Malformed API request')
        }
        return { id }
    }
}
