const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors');

/* eslint-disable no-unused-vars */
exports.Keycloak = class Keycloak {
	constructor(options, app) {
		this.options = options || {};
		this.app = app;
	}

	/**
	 * find
	 * @param {*} params 
	 * @returns 
	 */
	async find(params) {
		if(params.query.target == "clients") {
			// Make sure realm exists
			const response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == params.query.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}
			const clients = await this.app.get("keycloak").getClients(params.query.realm);
			return clients.filter(c => ![  
				"realm-management",
				"broker",
				"mdos",
				"account",
				"account-console",
				"admin-cli",
				"security-admin-console",
				"cs"
			].includes(c.clientId));
		}
		else if(params.query.target == "client-roles") {
			// Make sure realm exists
			let response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == params.query.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}

			// Make sure client ID exists
			response = await this.app.get("keycloak").getClients(params.query.realm);
			if(!response.find(o => o.clientId.toLowerCase() == params.query.clientId.toLowerCase())) {
				throw new Unavailable("Keycloak client does not exists");
			}

			const clientRoles = await this.app.get("keycloak").getClientRoles(params.query.realm, params.query.clientId);
			if(params.query.filterProtected == "true") 
				return clientRoles.filter(cr => ["uma_protection", "admin", "k8s-read", "k8s-write", "s3-read", "s3-write"].indexOf(cr.name) == -1);
			else
				return clientRoles.filter(cr => !["uma_protection"].includes(cr.name));
		}
		else if(params.query.target == "users") {
			// Make sure realm exists
			let response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == params.query.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}
			if(params.query.clientId) {
				// Make sure client ID exists
				response = await this.app.get("keycloak").getClients(params.query.realm);
				if(!response.find(o => o.clientId.toLowerCase() == params.query.clientId.toLowerCase())) {
					throw new Unavailable("Keycloak client does not exists");
				}
			}
			
			let users = await this.app.get("keycloak").getUsers(params.query.realm, params.query.clientId);
			
			return users;
		}
		else if(params.query.target == "user-roles") {
			// Make sure realm exists
			let response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == params.query.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}


			let roles = await this.app.get("keycloak").getUserRoles(params.query.realm, params.query.username);
			const mapping = [];
			Object.keys(roles.clientMappings).forEach((key) => {
                roles.clientMappings[key].mappings.forEach((cm) => {
                    mapping.push({
                        client: key,
                        uuid: cm.id,
                        name: cm.name
                    });
                });
            });

			return mapping.filter(m => ![  
				"uma_protection"
			].includes(m.name));
		}
	}

	/**
	 * create
	 * @param {*} body 
	 * @param {*} params 
	 * @returns 
	 */
	async create(body, params) {
		if (body.type == "user") {
			const keycloakAvailable = await this.app.get("keycloak").isKeycloakDeployed();
			if (!keycloakAvailable) {
				throw new Error("Keycloak is not installed");
			}

			let response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == body.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}

			// Make sure user ID does not exist
			response = await this.app.get("keycloak").getUsers(body.realm);
			if(response.find(o => o.username.toLowerCase() == body.username.toLowerCase() || o.email.toLowerCase() == body.email.toLowerCase())) {
				throw new Conflict("Keycloak username already exists");
			}

			// Create keycloak user
			await this.app.get("keycloak").createUser(body.realm, body.username, body.password, body.email);
		} 
		else if (body.type == "client-role") {
			// Make sure keycloak is deployed
			const keycloakAvailable = await this.app.get("keycloak").isKeycloakDeployed();
			if (!keycloakAvailable) {
				throw new Error("Keycloak is not installed");
			}

			// Make sure realm exists
			let response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == body.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}

			// Make sure client ID exists
			response = await this.app.get("keycloak").getClients(body.realm);
			if(!response.find(o => o.id == body.clientUuid)) {
				throw new Unavailable("Keycloak client ID does not exist");
			}

			// Create keycloak client role
			await this.app.get("keycloak").createClientRole(body.realm, body.clientUuid, body.name);
		} 
		else if (body.type == "user-role") {
			// Make sure keycloak is deployed
			const keycloakAvailable = await this.app.get("keycloak").isKeycloakDeployed();
			if (!keycloakAvailable) {
				throw new Error("Keycloak is not installed");
			}

			// Make sure realm exists
			let response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == body.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}

			// Make sure client ID exists
			response = await this.app.get("keycloak").getClients(body.realm);
			if(!response.find(o => o.id == body.clientUuid)) {
				throw new Unavailable("Keycloak client ID does not exist");
			}

			// Make sure Role ID exists for client
			response = await this.app.get("keycloak").getClientRoles(body.realm, body.clientId);
			if(!response.find(o => o.id == body.roleUuid)) {
				throw new Unavailable("Keycloak role ID does not exist for this client ID");
			}

			// Make sure user does not already have this client role binding
			const userRolesResponse = await this.app.get("keycloak").getUserRoles(body.realm, body.username)
			const existingMappingsForClient = userRolesResponse.clientMappings ? userRolesResponse.clientMappings[body.clientName] : null;
			if(existingMappingsForClient && existingMappingsForClient.mappings.find((m) => m.name == body.roleName)) {
				throw new Conflict("Client role is already added for this user");
			}

			// Create keycloak user role binding
			await this.app.get("keycloak").createClientRoleBindingForUser(body.realm, body.clientUuid, body.userUuid, body.roleUuid, body.roleName);
		} 
		return body;	
	}

	/**
	 * remove
	 * @param {*} id 
	 * @param {*} params 
	 * @returns 
	 */
	async remove(id, params) {
		if(params.query.target == "clients") {
			// Make sure realm exists
			const response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == params.query.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}

			await this.app.get("keycloak").deleteClient(params.query.realm, id);
		}
		else if(params.query.target == "client-roles") {
			// Make sure realm exists
			let response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == params.query.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}

			try {
				await this.app.get("keycloak").removeClientRole(params.query.realm, params.query.clientUuid, id);
			} catch (error) {
				console.log(error);
				throw error;
			}
			
		}
		else if(params.query.target == "users") {
			// Make sure realm exists
			let response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == params.query.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}

			await this.app.get("keycloak").deleteUser(params.query.realm, id);
		}
		else if(params.query.target == "user-roles") {
			// Make sure realm exists
			let response = await this.app.get("keycloak").getRealms();
			if(!response.find(o => o.realm.toLowerCase() == params.query.realm.toLowerCase())) {
				throw new Unavailable("Keycloak realm does not exists");
			}

			await this.app.get("keycloak").removeClientRoleBindingFromUser(
				params.query.realm, 
				params.query.clientUuid, 
				params.query.userUuid, 
				params.query.roleName,
				id
			);
		}
		return { id };
	}

	async update(id, data, params) {
		return data;
	}

	async patch(id, data, params) {
		return data;
	}

	async get(id, params) {
		return {
			id, text: `A new message with ID: ${id}!`
		};
	}
};
