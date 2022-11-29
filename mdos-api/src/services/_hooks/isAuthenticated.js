const errors = require('@feathersjs/errors')

/**
 * Export
 *
 * @return {*} 
 */
module.exports = function () {
    return async (context) => {
        // If request is to get API mode, we allow it
        if(context.method == 'get' && context.path == 'mdos' && context.id == 'api-mode') return context
        // Is auth disabled?
        if (process.env.NO_ADMIN_AUTH == 'true' || context.app.get("mdos_framework_only")) return context
        if (context.params.provider != 'rest')
            // Internal calls don't need authentication
            return context
        if (!context.params.headers['authorization']) throw new errors.Forbidden('ERROR: You are not authenticated')

        // Get JWT token
        let access_token = context.params.headers['authorization'].split(" ")[1]
        if (access_token.slice(-1) === ';') {
            access_token = access_token.substring(0, access_token.length-1)
        }
        const jwtToken = await context.app.get('keycloak').userTokenInstrospect('mdos', access_token, true)
        if(!jwtToken.active) {
            throw new errors.Forbidden('ERROR: Authentication session timeout')
        }
        context.jwtToken = jwtToken
        return context
    }
}
