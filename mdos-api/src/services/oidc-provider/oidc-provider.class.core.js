const { NotFound, Conflict, Unavailable, Forbidden } = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')
const axios = require('axios')

class OidcProviderCore {

    /**
     * constructor
     * @param {*} app 
     */
    constructor(app) {
        this.app = app;
    }

   
    // async computeUserInfo(headers, params) {
      
    // }
}

module.exports = OidcProviderCore