const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')
const nanoid_1 = require('nanoid')
const nanoid = (0, nanoid_1.customAlphabet)('1234567890abcdefghijklmnopqrstuvwxyz', 10)
const KubeCore = require('./kube.class.core')

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
         *  LOOKUP NAMESPACE APPLICATIONS
         ******************************************/
        else if (params.query.target == 'applications') {
            // Make sure namespace exists
            if (!(await this.app.get('kube').hasNamespace(params.query.clientId))) {
                throw new NotFound('ERROR: Namespace does not exist')
            }
            let nsApps = await this.getMdosApplications(params.query.clientId)
            return nsApps
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
         *  CREATE NEW TENANT NAMESPACE
         ******************************************/
        else if (data.type == 'tenantNamespace') {
            // Make sure keycloak is deployed
            await this.keycloakInstallCheck()

            // Make sure realm exists
            await this.realmCheck(data.realm)

            // Make sure client ID does not exist
            await this.clientDoesNotExistCheck(data.realm, data.namespace)

            // Create namespace if not exist
            let nsCreated = await this.createNamespace(data.namespace)

            // Create keycloak client
            try {
                await this.app.get('keycloak').createClient(data.realm, data.namespace.toLowerCase())
            } catch (error) {
                // Clean up
                if (nsCreated)
                    try {
                        await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase())
                    } catch (err) {}
                throw error
            }

            // Create roles for clientId
            let tClient = null
            try {
                tClient = await this.app.get('keycloak').getClient(data.realm, data.namespace.toLowerCase())
                await this.createKeycloakClientRoles(data.realm, tClient.id)
            } catch (error) {
                // Clean up
                if (nsCreated)
                    try {
                        await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase())
                    } catch (err) {}

                try {
                    if (tClient) await this.app.get('keycloak').deleteClient(data.realm, tClient.id)
                } catch (err) {}
                throw error
            }

            // Create ftpd credentials
            try {
                const nsName = data.namespace.toLowerCase()
                const secretName = `ftpd-${nsName}-creds`
                const credentials = await this.app.get("ftpServer").createFtpdCredentials(nsName)
                const secretExists = await this.app.get('kube').hasSecret("mdos", secretName)
                if(secretExists)
                    await this.app.get('kube').replaceSecret("mdos", secretName, credentials)
                else
                    await this.app.get('kube').createSecret("mdos", secretName, credentials)
            } catch (error) {
                // Clean up
                if (nsCreated)
                    try {
                        await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase())
                    } catch (err) {}

                try {
                    if (tClient) await this.app.get('keycloak').deleteClient(data.realm, tClient.id)
                } catch (err) {}
                throw error
            }

            // Create SA user for registry and give it registry-pull role
            const saUser = nanoid().toLowerCase()
            const saPass = nanoid().toLowerCase()
            try {
                await this.createKeycloakSaForNamespace(data.realm, tClient.clientId, tClient.id, saUser, saPass)
            } catch (error) {
                // Clean up
                if (nsCreated)
                    try {
                        await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase())
                    } catch (err) {}

                try {
                    if (tClient) await this.app.get('keycloak').deleteClient(data.realm, tClient.id)
                } catch (err) {}
                throw error
            }

            // Create secret for registry SA
            try {
                await this.app.get('kube').createRegistrySecret(data.namespace.toLowerCase(), 'mdos-regcred', saUser, saPass)
            } catch (error) {
                // Clean up
                if (nsCreated)
                    try {
                        await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase())
                    } catch (err) {}

                try {
                    if (tClient) await this.app.get('keycloak').deleteClient(data.realm, tClient.id)
                } catch (err) {}
                throw error
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

            // Delete keycloak client
            if (clientFound) await this.app.get('keycloak').deleteClient(params.query.realm, clientFound.id)

            // Delete FTPD secrets & credentials, make non fatal / non blocking
            try {
                const nsName = clientFound.id.toLowerCase()
                // Detete pure-ftpd credentials
                await this.app.get('ftpServer').removeFtpdCredentials(nsName)
                // Detete ftp credentials from mdos namespace
                await this.app.get('kube').deleteSecret("mdos", `ftpd-${nsName}-creds`)
            } catch (_e) {
                console.log(_e)
            }

            // Delete SA keycloak user
            if (nsExists) {
                await this.deleteKeycloakSAUser(params.query.realm, id)
            }

            // Delete namespace
            if (nsExists) await this.app.get('kube').deleteNamespace(id.toLowerCase())
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
