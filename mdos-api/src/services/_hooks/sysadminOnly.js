const errors = require('@feathersjs/errors');
const jwt_decode = require('jwt-decode')

module.exports = function () {
    return async (context) => {
        if (!context.params.headers['x-auth-request-access-token']) {
            throw new errors.Forbidden('You are not authenticated');
        }
        let jwtToken = jwt_decode(context.params.headers['x-auth-request-access-token'])
        if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.find((r) => r == 'mdos_admin')) {
            return context;
        } else {
            throw new errors.Forbidden('You are not authorized to access this resource');
        }        
    };  
}