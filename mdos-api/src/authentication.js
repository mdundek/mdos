const { AuthenticationService, AuthenticationBaseStrategy } = require('@feathersjs/authentication')
const { expressOauth } = require('@feathersjs/authentication-oauth')

class KeycloakStrategy extends AuthenticationBaseStrategy {
    /**
     * authenticate
     * @param {*} data
     */
    async authenticate(data) {
        const { email, password } = data

        console.log('AUTH REQUEST =>', data)
        // let error = new Error('Unknown user');
        // error.statusCode = 401;
        // err.code = 401;
        // return reject(new NotAuthenticated(error));

        return {
            authentication: { strategy: this.name },
            user: {
                id: '123',
                username: 'foo',
                email: 'bar',
            },
        }
    }
}

class KcAuthService extends AuthenticationService {
    async getPayload(authResult, params) {
        console.log('authResult=>', authResult)
        const payload = {
            id: '456',
            username: 'foo2',
            email: 'bar3',
        }
        return payload
    }
}

module.exports = (app) => {
    const authentication = new KcAuthService(app)
    authentication.register('keycloak', new KeycloakStrategy())
    app.use('/authentication', authentication)
    app.configure(expressOauth())
}
