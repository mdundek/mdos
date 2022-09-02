const jwt_decode = require('jwt-decode')

/* eslint-disable no-unused-vars */
exports.Logout = class Logout {
  constructor (options, app) {
    this.options = options || {};
    this.app = app;
  }

  async find (params) {
    if(params.headers["x-auth-request-access-token"]) {
      let jwtToken = jwt_decode(params.headers["x-auth-request-access-token"]);

      await this.app.get("keycloak").logout("mdos", jwtToken.preferred_username);
    }
    return "ok";
  }

  async get (id, params) {
    return {
      id, text: `A new message with ID: ${id}!`
    };
  }

  async create (data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this.create(current, params)));
    }

    return data;
  }

  async update (id, data, params) {
    return data;
  }

  async patch (id, data, params) {
    return data;
  }

  async remove (id, params) {
    return { id };
  }
};
