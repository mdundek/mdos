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
            console.log("----")
            let gateways = await this.app.get('kube').getIstioGateways(params.query.namespace ? params.query.namespace : "", params.query.name ? params.query.name : false)
            console.log("----")
            if(params.query.host){
                console.log("----")
                return this.app.get('gateways').findMatchingGateways(gateways, params.query.host)
            }
            else {
                return gateways
            }
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
        if (data.type == 'cm-issuer') {
            let issuerYaml
            try {
                const yamlDocs = data.issuerYaml.split("---")
console.log(yamlDocs)

                issuerYaml = YAML.parse(data.issuerYaml)
            } catch (error) {
                console.log(error)
                throw new BadRequest('ERROR: The YAML file could not be parsed. Make sur it is valid YAML.')
            }
            

            // Check to see if issuer name already exists
            
            console.log("------------------------")
            console.log(issuerYaml)
            console.log("------------------------")
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
        } else {
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

            // Lookup keycloak client if exists
            let response = await this.app.get('keycloak').getClients(params.query.realm)
            const clientFound = response.find((o) => o.clientId.toLowerCase() == id.toLowerCase())

            // Make sure namespace exists
            let nsExists = true
            if (!(await this.app.get('kube').hasNamespace(id.toLowerCase()))) {
                nsExists = false
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
        } else {
            throw new BadRequest('ERROR: Malformed API request')
        }
        return { id }
    }
}
