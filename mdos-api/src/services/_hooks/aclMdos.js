const errors = require('@feathersjs/errors');
const jwt_decode = require('jwt-decode')
const YAML = require("yaml");

/**
 * appDeployHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const appDeployHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin")
    )) {
        return context;
    }

    const plainValues = YAML.parse(Buffer.from(context.data.values, 'base64').toString('utf8'));

    if(!jwtToken.resource_access[plainValues.tenantName]) {
        throw new errors.Forbidden("You are not authorized to deploy applications to this namespace");
    }
    // If no namespace write permissions
    if(!jwtToken.resource_access[plainValues.tenantName].roles.includes("k8s-write") && !jwtToken.resource_access[plainValues.tenantName].roles.includes("admin")) {
        throw new errors.Forbidden("You are not authorized to deploy applications to this namespace");
    }
    
    return context;     
}

/**
 * 
 * @returns Export
 */
module.exports = function () {
    return async (context) => {
        // Is auth disabled?
        if(process.env.NO_ADMIN_AUTH == "true")
            return context;
        if(context.params.provider != "rest") // Internal calls don't need authentication
            return context;
        if (!context.params.headers['x-auth-request-access-token'])
            throw new errors.Forbidden('You are not authenticated');

        // If no auth enabled, simply return data
        if(process.env.NO_ADMIN_AUTH == "true")
            return context;

        let jwtToken = jwt_decode(context.params.headers['x-auth-request-access-token'])

        // Evaluate permissions
        if(context.path == "mdos" && context.data.type == "deploy") {
            return await appDeployHook(context, jwtToken);
        } 

        return context;
    };  
}