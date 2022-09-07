/* eslint-disable no-unused-vars */
exports.DirectLogin = class DirectLogin {
    constructor(options, app) {
        this.options = options || {}
        this.app = app
    }

    async create(data, params) {
        const response = await this.app.get('keycloak').directLogin('mdos', data.username, data.password)
        return response
    }
}
