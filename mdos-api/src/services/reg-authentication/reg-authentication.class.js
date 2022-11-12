const { Forbidden } = require('@feathersjs/errors')

/* eslint-disable no-unused-vars */
exports.RegAuthentication = class RegAuthentication {

    /**
     * Creates an instance of RegAuthentication.
     * @param {*} options
     * @param {*} app
     */
    constructor(options, app) {
        this.options = options || {}
        this.app = app
    }

    /**
     * Find
     *
     * @param {*} params
     * @return {*} 
     */
    async find(params) {
        const plainCreds = JSON.parse(Buffer.from(params.query.creds, 'base64').toString('utf8'))
        // Login
        const result = await this.app.get('keycloak').getUserAccessToken('mdos', plainCreds.username, plainCreds.password)
        if(result.error)
            throw new Forbidden("Invalid credentials")
        return 'ok'
    }
}
