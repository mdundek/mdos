const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors');
const OidcProviderCore = require('./oidc-provider.class.core')

/* eslint-disable no-unused-vars */
exports.OidcProvider = class OidcProvider extends OidcProviderCore {
	constructor(options, app) {
        super(app);
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
			// Make sure keycloak is deployed
			await this.keycloakInstallCheck();

			// Make sure OIDC provider does not already exist
			await this.ensureProviderNotDeclared(body.data.name);
			
			// Make sure client ID exists
			await this.clientIdCheck(body.realm, body.data.clientId);

			// Deploy OAuth2 proxy
			await this.app.get("kube").deployOauth2Proxy("keycloak", body.realm, body.data);

			// Add provider config to Istio
			try {
				await this.app.get("kube").addIstiodOidcProvider(body.data.name);
			} catch (error) {
				// Cleanup
				try { await this.app.get("kube").uninstallOauth2Proxy(body.data.name); } catch (_e) {}
				throw error;
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
		await this.oidcProviderCheck(id);

		await this.app.get("kube").uninstallOauth2Proxy(id);
		await this.app.get("kube").removeOidcProviders(id);
		
		return { id };
	}
};
