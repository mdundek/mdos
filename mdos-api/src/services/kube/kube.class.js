const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')
const nanoid_1 = require("nanoid");
const nanoid = (0, nanoid_1.customAlphabet)('1234567890abcdefghijklmnopqrstuvwxyz', 10);
const KubeCore = require('./kube.class.core')

/* eslint-disable no-unused-vars */
exports.Kube = class Kube extends KubeCore {
    constructor(options, app) {
        super(app);
        this.options = options || {}
        this.app = app
    }

    /**
     * find
     * @param {*} params 
     * @returns 
     */
    async find(params, context) {
        if(params.query.target == 'namespaces') {
            try {
                const nsListEnriched = await this.getEnrichedNamespaces(params.query.realm, params.query.includeKcClients);
                return nsListEnriched;
            } catch (error) {
                console.log(error);
                throw error
            }
        } else if(params.query.target == 'applications') {
            try {
                // Make sure namespace exists
                if (!(await this.app.get('kube').hasNamespace(params.query.clientId))) {
                    throw new NotFound("Namespace does not exist");
                }

                let nsApps = await this.getMdosApplications(params.query.clientId);
                return nsApps;
            } catch (error) {
                console.log(error);
                throw error
            }
        } else {
            throw new BadRequest("Malformed API request");
        }
    }

    async get(id, params) {
        return {
            id,
            text: `A new message with ID: ${id}!`,
        }
    }

    /**
     * create
     * @param {*} data 
     * @param {*} params 
     * @returns 
     */
    async create(data, params) {
        if (data.type == 'secret') {
            if (await this.app.get('kube').hasSecret(data.namespace, data.name)) {
                await this.app.get('kube').replaceSecret(data.namespace, data.name, data.data)
            } else {
                await this.app.get('kube').createSecret(data.namespace, data.name, data.data)
            }
        }
        else if (data.type == 'tenantNamespace') {
            // Make sure keycloak is deployed
			await this.keycloakInstallCheck();
            
			// Make sure realm exists
			await this.realmCheck(data.realm);

			// Make sure client ID does not exist
            await this.clientDoesNotExistCheck(data.realm, data.namespace);

            // Create namespace if not exist
            let nsCreated = await this.createNamespace(data.namespace);

			// Create keycloak client
            try {
                await this.app.get("keycloak").createClient(data.realm, data.namespace.toLowerCase());
            } catch (error) {
                // Clean up
                if(nsCreated)
                    try { await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase()) } catch (err) { }
                throw error;
            }

            // Create roles for clientId
            let tClient = null;
            try {
                tClient = await this.app.get('keycloak').getClient(data.realm, data.namespace.toLowerCase());
                await this.createKeycloakClientRoles(data.realm, tClient.id);
            } catch (error) {
                // Clean up
                if(nsCreated)
                    try { await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase()) } catch (err) { }

                try {
                    if(tClient)
                         await this.app.get('keycloak').deleteClient(data.realm, tClient.id);
                } catch (err) { }
                throw error;
            }

            // Create Minio bucket and credentials
            try {
                const credentials = await this.app.get('s3').createNamespaceBucket(data.namespace.toLowerCase());
                await this.app.get('s3').storeNamespaceCredentials(data.namespace.toLowerCase(), credentials);
            } catch (error) {
                // Clean up
                if(nsCreated)
                    try { await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase()) } catch (err) { }
                    
                try {
                    if(tClient)
                        await this.app.get('keycloak').deleteClient(data.realm, tClient.id);
                } catch (err) { }
                throw error;
            }

            // Create SA user for registry and give it registry-pull role
            const saUser = nanoid().toLowerCase();
            const saPass = nanoid().toLowerCase();
            try {
                await this.createKeycloakSaForNamespace(data.realm, tClient.clientId, tClient.id, saUser, saPass);
            } catch (error) {
                // Clean up
                if(nsCreated)
                try { await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase()) } catch (err) { }

                try {
                    if(tClient)
                        await this.app.get('keycloak').deleteClient(data.realm, tClient.id);
                } catch (err) { }
                throw error;
            }

            // Create secret ffor registry SA
            try {
                await this.app.get('kube').createRegistrySecret(data.namespace.toLowerCase(), "mdos-regcred", saUser, saPass);
            } catch (error) {
                // Clean up
                if(nsCreated)
                try { await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase()) } catch (err) { }

                try {
                    if(tClient)
                        await this.app.get('keycloak').deleteClient(data.realm, tClient.id);
                } catch (err) { }
                throw error;
            }
        } else {
            throw new BadRequest("Malformed API request");
        }
        return data
    }

    async update(id, data, params) {
        return data
    }

    async patch(id, data, params) {
        return data
    }

    async remove(id, params) {
        if(params.query.target == "tenantNamespace") {
            // Make sure keycloak is deployed
			await this.keycloakInstallCheck();

			// Make sure realm exists
			await this.realmCheck(params.query.realm);

			// Lookup keycloak client if exists
			let response = await this.app.get("keycloak").getClients(params.query.realm);
            const clientFound = response.find(o => o.clientId.toLowerCase() == id.toLowerCase())

			// Make sure namespace exists
            let nsExists = true;
            if (!(await this.app.get('kube').hasNamespace(id.toLowerCase()))) {
                nsExists = false;
            }

            // Delete keycloak client
            if(clientFound)
			    await this.app.get("keycloak").deleteClient(params.query.realm, clientFound.id);

            // Delete S3 secrets & bucket, make non fatal / non blocking
            try {
                await this.app.get('s3').deleteNamespaceBucket(id.toLowerCase(), nsExists);
            } catch (_e) {
                console.log(_e);
            }

            // Delete SA keycloak user
            if(nsExists) {
                await this.deleteKeycloakSAUser(params.query.realm, id);
            }

            // Delete namespace
            if(nsExists)
                await this.app.get('kube').deleteNamespace(id.toLowerCase());
		}
        if(params.query.target == "application") {
            // Make sure namespace exists
            if (!(await this.app.get('kube').hasNamespace(params.query.clientId))) {
                throw new NotFound("Namespace does not exist");
            }

            await this.deleteApplication(params.query.clientId, id, params.query.isHelm == 'true', params.query.type);
        } else {
            throw new BadRequest("Malformed API request");
        }
		return { id };
    }
}
