const jwt_decode = require('jwt-decode')

/* eslint-disable no-unused-vars */
exports.Logout = class Logout {

    /**
     * Creates an instance of Logout.
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
        if (params.headers['x-auth-request-access-token']) {
            let jwtToken = jwt_decode(params.headers['x-auth-request-access-token'])

            await this.app.get('keycloak').logout('mdos', jwtToken.preferred_username)
        }
        return 'ok'
    }

    /**
     * Create
     *
     * @param {*} data
     * @param {*} params
     * @return {*} 
     */
    async create(data, params) {
        if (Array.isArray(data)) {
            return Promise.all(data.map((current) => this.create(current, params)))
        }

        return data
    }
}
