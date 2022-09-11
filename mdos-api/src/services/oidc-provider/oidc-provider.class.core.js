const { NotFound, Conflict, Unavailable, Forbidden } = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')
const axios = require('axios')
const CommonCore = require('../common.class.core')

/**
 * OIDC core functions class
 *
 * @class KubeCore
 * @extends {CommonCore}
 */
class OidcProviderCore extends CommonCore {
    /**
     * constructor
     * @param {*} app
     */
    constructor(app) {
        super(app)
        this.app = app
    }

    /**
     *
     * @param {*} name
     */
    async oidcProviderCheck(name) {
        let responses = await this.app.get('kube').getOidcProviders()
        if (!responses.find((o) => o.name.toLowerCase() == name.toLowerCase())) {
            throw new Unavailable('ERROR: OIDC provider not found')
        }
    }

    /**
     * ensureProviderNotDeclared
     * @param {*} name
     */
    async ensureProviderNotDeclared(name) {
        let responses = await this.app.get('kube').getOidcProviders()
        if (responses.find((o) => o.name.toLowerCase() == name.toLowerCase())) {
            throw new Conflict('ERROR: OIDC provider already declared')
        }
    }
}

module.exports = OidcProviderCore
