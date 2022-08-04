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
	async create(data, params) {
		if (data.type == "keycloak-deploy") {
			const keycloakAvailable = await this.app.get("keycloak").isKeycloakDeployed();
			if (!keycloakAvailable) {
				return await this.app.get("keycloak").deployKeycloak(data);
			} else {
				throw new Error("Keycloak already installed");
			}
		}
		else if (data.type == "keycloak") {
			const keycloakAvailable = await this.app.get("keycloak").isKeycloakDeployed();
			if (!keycloakAvailable) {
				throw new Error("Keycloak is not installed");
			}
		}

		// await this.app.get("kube").addOidcProviders(data);
		return data;
	}

	async update(id, data, params) {
		return data;
	}

	async patch(id, data, params) {
		return data;
	}

	async remove(id, params) {
		await this.app.get("kube").removeOidcProviders(id);
		return { id };
	}
};
