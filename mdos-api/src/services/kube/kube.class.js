const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')

/* eslint-disable no-unused-vars */
exports.Kube = class Kube {
    constructor(options, app) {
        this.options = options || {}
        this.app = app
    }

    async find(params) {
        switch (params.query.target) {
            case 'namespaces':
                let allNamespaces = await this.app.get('kube').getNamespaces()
                let allClients = null;
                if(params.query.includeKcClients) {
                    const response = await this.app.get("keycloak").getRealms();
                    if(!response.find(o => o.realm.toLowerCase() == params.query.realm.toLowerCase())) {
                        throw new Unavailable("Keycloak realm does not exists");
                    }
                    allClients = await this.app.get("keycloak").getClients(params.query.realm);
                }
            
                allNamespaces = allNamespaces.map(ns => {
                    return {
                        name: ns.metadata.name,
                        status: ns.status.phase
                    }
                }).filter(ns => ![  "local-path-storage",
                                    "mdos",
                                    "oauth2-proxy",
                                    "keycloak",
                                    "code-server",
                                    "minio",
                                    "mdos-registry",
                                    "calico-apiserver",
                                    "calico-system",
                                    "tigera-operator",
                                    "kube-node-lease",
                                    "kube-public",
                                    "kube-system",
                                    "default",
                                    "istio-system"
                ].includes(ns.name));

                if(allClients) {
                    allNamespaces = allNamespaces.map(ns => {
                        ns.kcClient = allClients.find(kcc => kcc.clientId == ns.name) ? true : false;
                        return ns;
                    });
                }
                
                return allNamespaces;
        }
    }

    async get(id, params) {
        return {
            id,
            text: `A new message with ID: ${id}!`,
        }
    }

    async create(data, params) {
        if (data.type == 'secret') {
            if (await this.app.get('kube').hasSecret(data.namespace, data.name)) {
                await this.app.get('kube').replaceSecret(data.namespace, data.name, data.data)
            } else {
                await this.app.get('kube').createSecret(data.namespace, data.name, data.data)
            }
        }

        if (data.type == 'tenantNamespace') {
            // Make sure keycloak is deployed
			const keycloakAvailable = await this.app.get("keycloak").isKeycloakDeployed();
			if (!keycloakAvailable) {
				throw new Error("Keycloak is not installed");
			}

			// Make sure realm exists
			let response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == data.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}

			// Make sure client ID does not exist
			response = await this.app.get("keycloak").getClients(data.realm);
			if(response.find(o => o.clientId.toLowerCase() == data.namespace.toLowerCase())) {
				throw new Conflict("Keycloak client ID already exists");
			}

            // Create namespace if not exist
            if (!(await this.app.get('kube').hasNamespace(data.namespace.toLowerCase()))) {
                await this.app.get('kube').createNamespace({name: data.namespace.toLowerCase()})
            } else {
                throw new Conflict('Namespace already exists')
            }

			// Create keycloak client
            try {
                await this.app.get("keycloak").createClient(data.realm, data.namespace.toLowerCase());
            } catch (error) {
                // Clean up
                try { await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase()) } catch (err) { }
                throw error;
            }

            // Create roles for clientId
            try {
                const tClient = await this.app.get('keycloak').getClient(data.realm, data.namespace.toLowerCase());
                await this.app.service("keycloak").create({
                    type: "client-role",
                    realm: data.realm,
                    name: "admin",
                    clientUuid: tClient.id
                });
                await this.app.service("keycloak").create({
                    type: "client-role",
                    realm: data.realm,
                    name: "k8s-write",
                    clientUuid: tClient.id
                });
                await this.app.service("keycloak").create({
                    type: "client-role",
                    realm: data.realm,
                    name: "k8s-read",
                    clientUuid: tClient.id
                });
                await this.app.service("keycloak").create({
                    type: "client-role",
                    realm: data.realm,
                    name: "s3-write",
                    clientUuid: tClient.id
                });
                await this.app.service("keycloak").create({
                    type: "client-role",
                    realm: data.realm,
                    name: "s3-read",
                    clientUuid: tClient.id
                });
            } catch (error) {
                // Clean up
                try { await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase()) } catch (err) { }
                try {
                    const dClient = await this.app.get('keycloak').getClient(data.realm, data.namespace.toLowerCase());
                    await this.app.get('keycloak').deleteClient(data.realm, dClient.id);
                } catch (err) { }
                throw error;
            }

            // Create Minio bucket and credentials
            try {
                const credentials = await this.app.get('s3').createNamespaceBucket(data.namespace.toLowerCase());
                await this.app.get('s3').storeNamespaceCredentials(data.namespace.toLowerCase(), credentials);
            } catch (error) {
                // Clean up
                try { await this.app.get('kube').deleteNamespace(data.namespace.toLowerCase()) } catch (err) { }
                try {
                    const dClient = await this.app.get('keycloak').getClient(data.realm, data.namespace.toLowerCase());
                    await this.app.get('keycloak').deleteClient(data.realm, dClient.id);
                } catch (err) { }
                throw error;
            }
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
			const keycloakAvailable = await this.app.get("keycloak").isKeycloakDeployed();
			if (!keycloakAvailable) {
				throw new Error("Keycloak is not installed");
			}

			// Lookup keycloak client if exists
			let response = await this.app.get("keycloak").getRealms();
            let clientFound = null;
			if(response.find(o => o.realm.toLowerCase() == params.query.realm)) {
				response = await this.app.get("keycloak").getClients(params.query.realm);
                clientFound = response.find(o => o.clientId.toLowerCase() == id.toLowerCase())
			}

			// Make sure namespace exists
            if (!(await this.app.get('kube').hasNamespace(id.toLowerCase()))) {
                throw new NotFound('Namespace does not exist')
            }

            // Delete keycloak client
            if(clientFound)
			    await this.app.get("keycloak").deleteClient(params.query.realm, clientFound.id);

            // Delete S3 secrets & bucket, make non fatal / non blocking
            try {
                await this.app.get('s3').deleteNamespaceCredentials(id.toLowerCase());
            } catch (_e) {}
            try {
                await this.app.get('s3').deleteNamespaceBucket(id.toLowerCase());
            } catch (_e) {}

            // Delete namespace
            await this.app.get('kube').deleteNamespace(id.toLowerCase());
		}
		return { id };
    }
}
