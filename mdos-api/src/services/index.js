const oidcProvider = require('./oidc-provider/oidc-provider.service.js')
const kube = require('./kube/kube.service.js')
const keycloak = require('./keycloak/keycloak.service.js')
const mdos = require('./mdos/mdos.service.js')
const regAuthentication = require('./reg-authentication/reg-authentication.service.js')
const regAuthorization = require('./reg-authorization/reg-authorization.service.js')
const schemaValidator = require('./schema-validator/schema-validator.service.js')
const logout = require('./logout/logout.service.js')
const directLogin = require('./direct-login/direct-login.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
    app.configure(oidcProvider)
    app.configure(kube)
    app.configure(keycloak)
    app.configure(mdos)
    app.configure(regAuthentication)
    app.configure(regAuthorization)
    app.configure(schemaValidator)
    app.configure(logout)
    app.configure(directLogin);
}
