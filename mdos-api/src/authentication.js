const { AuthenticationService, AuthenticationBaseStrategy } = require('@feathersjs/authentication')
const { expressOauth } = require('@feathersjs/authentication-oauth')
const { NotFound, GeneralError, BadRequest, NotAuthenticated } = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')

class KeycloakStrategy extends AuthenticationBaseStrategy {
    /**
     * authenticate
     * @param {*} data
     */
    async authenticate(data) {
        const { username, password } = data
        const userAuthToken = await this.app.get("keycloak").getUserAccessToken("mdos", username, password)
        if(userAuthToken.error) {
            let error = new Error('ERROR: Invalide user credentials');
            error.statusCode = 401;
            error.code = 401;
            throw new NotAuthenticated(error);
        }
        return userAuthToken
    }
}

class KcAuthService extends AuthenticationService {
    async getPayload(authResult, params) {
        return authResult
    }
}

module.exports = (app) => {
    const authentication = new KcAuthService(app)
    const keycloakStrategy = new KeycloakStrategy()
    authentication.register('keycloak', keycloakStrategy)
    app.use('/authentication', authentication)
    app.configure(expressOauth())
}
