const { Forbidden } = require('@feathersjs/errors')

/* eslint-disable no-unused-vars */
exports.RegAuthentication = class RegAuthentication {
    constructor(options, app) {
        this.options = options || {}
        this.app = app
    }

    async find(params) {
        const plainCreds = JSON.parse(Buffer.from(params.query.creds, 'base64').toString('utf8'))
        // Login
        await this.app.get("keycloak").getUserAccessToken("mdos", plainCreds.username, plainCreds.password);
        // Login successfull, otherwise we would not be here

        // Get user roles
        const userRoles = await this.app.get("keycloak").getUserRoles("mdos", plainCreds.username);
        // console.log(userRoles);
       
        return 'ok'
    }

    async get(id, params) {
        return {
            id,
            text: `A new message with ID: ${id}!`,
        }
    }

    async create(data, params) {
        return 'ok'
    }

    async update(id, data, params) {
        return data
    }

    async patch(id, data, params) {
        return data
    }

    async remove(id, params) {
        return { id }
    }
}
