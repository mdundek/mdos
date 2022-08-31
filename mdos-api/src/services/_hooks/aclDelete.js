const errors = require('@feathersjs/errors');
const jwt_decode = require('jwt-decode')

/**
 * userDeleteHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const userDeleteHook = (context, jwtToken) => {
    if( !jwtToken.resource_access.mdos || 
        (
            !jwtToken.resource_access.mdos.roles.includes("admin") &&
            !jwtToken.resource_access.mdos.roles.includes("delete-users")
        )
    ) {
        throw new errors.Forbidden("You are not authorized to delete users");
    }
    return context;     
}

/**
 * userRoleDeleteHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const userRoleDeleteHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("assign-roles")
    )) {
        return context;
    }
    // If not namespace admin
    if(!jwtToken.resource_access[context.params.query.clientId] || !jwtToken.resource_access[context.params.query.clientId].roles.includes("admin")) {
        throw new errors.Forbidden("You are not authorized to assign user roles");
    }
    return context;
}

/**
 * clientRoleDeleteHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const clientRoleDeleteHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("delete-roles")
    )) {
        return context;
    }
    // If not namespace admin
    if(!jwtToken.resource_access[context.params.query.clientId] || !jwtToken.resource_access[context.params.query.clientId].roles.includes("admin")) {
        throw new errors.Forbidden("You are not authorized to delete client roles");
    }
    return context;
}

/**
 * namespaceDeleteHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const namespaceDeleteHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("delete-namespace")
    )) {
        return context;
    }
    // Otherwise unauthorized
    throw new errors.Forbidden("You are not authorized to delete namespaces");
}

/**
 * applicationDeleteHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const applicationDeleteHook = (context, jwtToken) => {
   // If mdos admin or list-user
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("delete-namespace")
    )) {
        return context;
    }

    // If namespace admin or write role
    if(jwtToken.resource_access[context.params.query.clientId] && (
        jwtToken.resource_access[context.params.query.clientId].roles.includes("admin") || 
        jwtToken.resource_access[context.params.query.clientId].roles.includes("k8s-write")
    )) {
        return context;
    }
    
    // Otherwise unauthorized
    throw new errors.Forbidden("You are not authorized to delete applications");
}

/**
 * oidcProviderDeleteHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const oidcProviderDeleteHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("oidc-remove")
    )) {
        return context;
    }
    // Otherwise unauthorized
    throw new errors.Forbidden("You are not authorized to delete oidc providers");
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
        if(context.path == "keycloak" && context.params.query.target == "users") {
            return await userDeleteHook(context, jwtToken);
        } 
        else if(context.path == "keycloak" && context.params.query.target == "user-roles") {
            return await userRoleDeleteHook(context, jwtToken);
        }
        else if(context.path == "keycloak" && context.params.query.target == "client-roles") {
            return await clientRoleDeleteHook(context, jwtToken);
        } 
        else if(context.path == "kube" && context.params.query.target == "tenantNamespace") {
            return await namespaceDeleteHook(context, jwtToken);
        }
        else if(context.path == "kube" && context.params.query.target == "application") {
            return await applicationDeleteHook(context, jwtToken);
        }
        else if(context.path == "oidc-provider" && !context.params.query.target) {
            return await oidcProviderDeleteHook(context, jwtToken);
        }
        else {
            console.log("Unknown: ", context.params.query, context.path);
        }
        
        return context;
    };  
}