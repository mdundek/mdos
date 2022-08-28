const { BadRequest, Unavailable } = require('@feathersjs/errors');
const KeycloakCore = require('./keycloak.class.core')

/* eslint-disable no-unused-vars */
exports.Keycloak = class Keycloak extends KeycloakCore {
	constructor(options, app) {
        super(app);
		this.options = options || {};
		this.app = app;
	}

	/**
	 * find
	 * @param {*} params 
	 * @returns 
	 */
	async find(params) {
		// Make sure keycloak is installed
		await this.keycloakInstallCheck();
		
		if(params.query.target == "clients") {
			// Make sure realm exists
			await this.realmCheck(params.query.realm);

			// Get all clients except internal once
			const clients = await this.getClients(params.query.realm, params.query.include_mdos == "true");
			return clients;
		}
		else if(params.query.target == "client-roles") {
			// Make sure realm exists
			await this.realmCheck(params.query.realm);

			// Make sure client ID exists
			await this.clientIdCheck(params.query.realm, params.query.clientId);

			// Get client roles
			const clientRoles = await this.getClientRoles(params.query.realm, params.query.clientId, params.query.filterProtected);
			return clientRoles;
		}
		else if(params.query.target == "users") {
			// Make sure realm exists
			await this.realmCheck(params.query.realm);

			if(params.query.clientId) {
				// Make sure client ID exists
				await this.clientIdCheck(params.query.realm, params.query.clientId);
			}
			
			let users = await this.app.get("keycloak").getUsers(params.query.realm, params.query.clientId);
			
			return users;
		}
		else if(params.query.target == "user-roles") {
			// Make sure realm exists
			await this.realmCheck(params.query.realm);

			// Get all user roles
			let roles = await this.getUserRoles(params.query.realm, params.query.username);
			return roles;
		} else {
            throw new BadRequest("Malformed API request");
        }
	}

	/**
	 * create
	 * @param {*} body 
	 * @param {*} params 
	 * @returns 
	 */
	async create(body, params) {
		// Make sure keycloak is installed
		await this.keycloakInstallCheck();

		if (body.type == "user") {
			// Make sure realm exists
			await this.realmCheck(body.realm);

			// Make sure user does not exist
			await this.userDoesNotExistCheck(body.realm, body.username, body.email);

			// Create keycloak user
			await this.app.get("keycloak").createUser(body.realm, body.username, body.password, body.email);
		} 
		else if (body.type == "client-role") {
			// Make sure realm exists
			await this.realmCheck(body.realm);

			// Make sure client ID exists
			await this.clientUuidCheck(body.realm, body.clientUuid);

			// Create keycloak client role
			await this.app.get("keycloak").createClientRole(body.realm, body.clientUuid, body.name);
		} 
		else if (body.type == "user-role") {
			// Make sure realm exists
			await this.realmCheck(body.realm);

			// Make sure client ID exists
			await this.clientUuidCheck(body.realm, body.clientUuid);

			// Make sure Role ID exists for client
			const response = await this.app.get("keycloak").getClientRoles(body.realm, body.clientId);
			if(!response.find(o => o.id == body.roleUuid)) {
				throw new Unavailable("Keycloak role ID does not exist for this client ID");
			}

			// Make sure user does not already have this client role binding
			await this.userDoesNotHaveRoleCheck(body.realm, body.username, body.clientName, body.roleName);

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
		// Make sure keycloak is installed
		await this.keycloakInstallCheck();

		if(params.query.target == "clients") {
			// Make sure realm exists
			await this.realmCheck(params.query.realm);

			await this.app.get("keycloak").deleteClient(params.query.realm, id);
		}
		else if(params.query.target == "client-roles") {
			// Make sure realm exists
			await this.realmCheck(params.query.realm);

			await this.app.get("keycloak").removeClientRole(params.query.realm, params.query.clientUuid, id);
		}
		else if(params.query.target == "users") {
			// Make sure realm exists
			await this.realmCheck(params.query.realm);

			await this.app.get("keycloak").deleteUser(params.query.realm, id);
		}
		else if(params.query.target == "user-roles") {
			// Make sure realm exists
			await this.realmCheck(params.query.realm);

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
