const { NotFound, Conflict, Unavailable, Forbidden } = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')
const axios = require('axios')
const CommonCore = require('../common.class.core');

class OidcProviderCore extends CommonCore {

    /**
     * constructor
     * @param {*} app 
     */
    constructor(app) {
        super(app);
        this.app = app;
    }

    /**
     * 
     * @param {*} name 
     */
    async oidcProviderCheck(name) {
        let responses = await this.app.get("kube").getIstiodOidcProviders();
		if(!responses.find(o => o.name.toLowerCase() == name.toLowerCase())) {
			throw new Unavailable("OIDC provider not found");
		}
    }
    

    /**
     * ensureProviderNotDeclared
     * @param {*} name 
     */
    async ensureProviderNotDeclared(name) {
        let responses = await this.app.get("kube").getIstiodOidcProviders();
        if(responses.find(o => o.name.toLowerCase() == name.toLowerCase())) {
            throw new Conflict("OIDC provider already declared");
        }
    }
}

module.exports = OidcProviderCore