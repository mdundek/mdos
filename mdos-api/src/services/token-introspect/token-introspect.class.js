/* eslint-disable no-unused-vars */
exports.TokenIntrospect = class TokenIntrospect {
  constructor(options, app) {
    this.options = options || {}
    this.app = app
  }

  async create(data, params) {
      const response = await this.app.get('keycloak').userTokenInstrospect('mdos', data.access_token, true)
      return response
  }
};
