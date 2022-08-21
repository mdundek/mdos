const errors = require('@feathersjs/errors');
const jwt_decode = require('jwt-decode')

module.exports = function () {
    return async (context) => {
        // Is auth disabled?
        if(process.env.NO_ADMIN_AUTH == "true")
            return context;
        if(context.params.provider != "rest") // Internal calls don't need authentication
            return context;

        if (!context.params.headers['x-auth-request-access-token']) {
            throw new errors.Forbidden('You are not authenticated');
        }
        let jwtToken = jwt_decode(context.params.headers['x-auth-request-access-token'])

        // if(context.data)
        //     console.log("        // BODY:", JSON.stringify(context.data)); //rest
        // if(context.params.query && Object.keys(context.params.query).length > 0)
        //     console.log("        // QUERY:", JSON.stringify(context.params.query)); //{ target: 'users', realm: 'mdos' }
        // console.log("        // METHOD:", context.method); // find
        // console.log("        // PATH:", context.path); // keycloak
        // console.log();

        // -=-=-=-=-=-=-=- mdos oidc protect-app -=-=-=-=-=-=-=

        // -=-=-=-=-=-=-=- mdos deploy -=-=-=-=-=-=-=



        // console.log(JSON.stringify(jwtToken, null, 4));

        if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.find((r) => r == 'admin')) {
            return context;
        } else {
            throw new errors.Forbidden('You are not authorized to access this resource');
        }        
    };  
}