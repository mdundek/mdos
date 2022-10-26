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
        try {
            const plainCreds = JSON.parse(Buffer.from(params.query.creds, 'base64').toString('utf8'))
            // Login
            await this.app.get('keycloak').getUserAccessToken('mdos', plainCreds.username, plainCreds.password)

            // Login successfull, otherwise we would not be here
            return 'ok'
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}
