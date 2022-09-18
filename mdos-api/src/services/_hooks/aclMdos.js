const errors = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')
const YAML = require('yaml')

/**
 * appDeployHook
 * @param {*} context
 * @param {*} jwtToken
 * @returns
 */
const appDeployHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.includes('admin')) {
        return context
    }

    const plainValues = YAML.parse(Buffer.from(context.data.values, 'base64').toString('utf8'))
    if (!jwtToken.resource_access[plainValues.tenantName]) {
        throw new errors.Forbidden('ERROR: You are not authorized to deploy applications to this namespace')
    }
    // If no namespace write permissions
    if (!jwtToken.resource_access[plainValues.tenantName].roles.includes('k8s-write') && !jwtToken.resource_access[plainValues.tenantName].roles.includes('admin')) {
        throw new errors.Forbidden('ERROR: You are not authorized to deploy applications to this namespace')
    }

    return context
}

/**
 * Export
 *
 * @return {*} 
 */
module.exports = function () {
    return async (context) => {
        // Is auth disabled?
        if (process.env.NO_ADMIN_AUTH == 'true') return context
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

        // Evaluate permissions
        if (context.path == 'mdos' && context.data.type == 'deploy') {
            return await appDeployHook(context, jwtToken)
        }

        return context
    }
}
