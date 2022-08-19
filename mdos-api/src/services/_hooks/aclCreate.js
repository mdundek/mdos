const errors = require('@feathersjs/errors');
const jwt_decode = require('jwt-decode')

/**
 * userRoleCreateHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const userRoleCreateHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("assign-roles")
    )) {
        return context;
    }
    // If not namespace admin
    if(!jwtToken.resource_access[context.data.clientId] || !jwtToken.resource_access[context.data.clientId].roles.includes("admin")) {
        throw new errors.Forbidden("You are not authorized to assign user roles");
    }
    return context;     
}

/**
 * userCreateHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
 const userCreateHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if( !jwtToken.resource_access.mdos || 
        (
            !jwtToken.resource_access.mdos.roles.includes("admin") &&
            !jwtToken.resource_access.mdos.roles.includes("create-users")
        )
    ) {
        throw new errors.Forbidden("You are not authorized to create users");
    }
    return context;     
}

/**
 * clientRoleCreateHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
 const clientRoleCreateHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("create-roles")
    )) {
        return context;
    }
    // If not namespace admin
    if(!jwtToken.resource_access[context.data.clientId] || !jwtToken.resource_access[context.data.clientId].roles.includes("admin")) {
        throw new errors.Forbidden("You are not authorized to create client roles");
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
        if(context.path == "keycloak" && context.data.type == "user") {
            return await userCreateHook(context, jwtToken);
        } 
        else if(context.path == "keycloak" && context.data.type == "user-role") {
            return await userRoleCreateHook(context, jwtToken);
        } 
        else if(context.path == "keycloak" && context.data.type == "client-role") {
            return await clientRoleCreateHook(context, jwtToken);
        } 

        return context;
    };  
}