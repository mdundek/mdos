const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')
const nanoid_1 = require("nanoid");
const nanoid = (0, nanoid_1.customAlphabet)('1234567890abcdefghijklmnopqrstuvwxyz', 10);

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
            let nsCreated = false;
            if (!(await this.app.get('kube').hasNamespace(data.namespace.toLowerCase()))) {
                await this.app.get('kube').createNamespace({name: data.namespace.toLowerCase()})
                nsCreated = true;
            } else {
                throw new Conflict('Namespace already exists')
            }

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
                await this.app.service("keycloak").create({
                    type: "client-role",
                    realm: data.realm,
                    name: "registry-pull",
                    clientUuid: tClient.id
                });
                await this.app.service("keycloak").create({
                    type: "client-role",
                    realm: data.realm,
                    name: "registry-push",
                    clientUuid: tClient.id
                });
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
                await this.app.get("keycloak").createUser(data.realm, saUser, saPass, "");
                const saUsersObj = await this.app.get("keycloak").getUser(data.realm, null, saUser);
                const roleObj = await this.app.get("keycloak").getClientRole(data.realm, tClient.clientId, "registry-pull");
                await this.app.get("keycloak").createClientRoleBindingForUser(data.realm, tClient.id, saUsersObj.id, roleObj.id, "registry-pull");
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
            let nsExists = true;
            if (!(await this.app.get('kube').hasNamespace(id.toLowerCase()))) {
                nsExists = false;
                // throw new NotFound('Namespace does not exist')
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

            if(nsExists) {
                // Delete SA keycloak user
                try {
                    const regSaSecret = await this.app.get('kube').getSecret(id.toLowerCase(), 'mdos-regcred')
                    if(regSaSecret) {
                        const username = JSON.parse(regSaSecret['.dockerconfigjson']).auths[`registry.${process.env.ROOT_DOMAIN}`].username;
                        const userObj = await this.app.get("keycloak").getUser(params.query.realm, null, username);
                        await this.app.get("keycloak").deleteUser(params.query.realm, userObj.id);
                    }
                } catch (_e) {
                    console.log(_e);
                }
            }

            // Delete namespace
            if(nsExists)
                await this.app.get('kube').deleteNamespace(id.toLowerCase());
		}
		return { id };
    }
}
