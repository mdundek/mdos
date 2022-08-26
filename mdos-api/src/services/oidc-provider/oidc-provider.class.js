const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors');

/* eslint-disable no-unused-vars */
exports.OidcProvider = class OidcProvider {
	constructor(options, app) {
		this.options = options || {};
		this.app = app;
	}

	async find(params) {
		return await this.app.get("kube").getOidcProviders();
	}

	async get(id, params) {
		return {
			id, text: `A new message with ID: ${id}!`
		};
	}

	/**
	 * create
	 * @param {*} data 
	 * @param {*} params 
	 * @returns 
	 */
	async create(body, params) {
		if (body.type == "keycloak") {
			try {
				const keycloakAvailable = await this.app.get("keycloak").isKeycloakDeployed();
				if (!keycloakAvailable) {
					throw new Error("Keycloak is not installed");
				}

				let responses = await this.app.get("kube").getIstiodOidcProviders();
				if(responses.find(o => o.name.toLowerCase() == body.data.name.toLowerCase())) {
					throw new Conflict("OIDC provider already declared");
				}

				// Make sure client ID exists
				responses = await this.app.get("keycloak").getClients(body.realm);
				if(!responses.find(o => o.clientId == body.data.clientId)) {
					throw new Unavailable("Keycloak client ID does not exist");
				}

				await this.app.get("kube").deployOauth2Proxy("keycloak", body.realm, body.data);
				try {
					await this.app.get("kube").addIstiodOidcProvider(body.data.name);
				} catch (error) {
					try { await this.app.get("kube").uninstallOauth2Proxy(body.data.name); } catch (_e) {}
					throw error;
				}
			} catch (error) {
					console.log(error);
					throw error
			}
		} else {
			throw new Unavailable("Provider type not implemented yet");
		}
		return body;
	}

	async update(id, data, params) {
		return data;
	}

	async patch(id, data, params) {
		return data;
	}

	async remove(id, params) {
		let responses = await this.app.get("kube").getIstiodOidcProviders();
		if(!responses.find(o => o.name.toLowerCase() == id.toLowerCase())) {
			throw new Unavailable("OIDC provider not found");
		}

		await this.app.get("kube").uninstallOauth2Proxy(id);
		await this.app.get("kube").removeOidcProviders(id);
		
		return { id };
	}
};
