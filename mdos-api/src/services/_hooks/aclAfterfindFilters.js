const errors = require('@feathersjs/errors');
const jwt_decode = require('jwt-decode')

/**
 * userFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const userFilterHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("list-users") ||
        jwtToken.resource_access.mdos.roles.includes("assign-roles")
    )) {
        return context;
    }

    // If namespace admin
    context.result = context.result  
        .map(user => {
            user.clients = user.clients.split(",").filter(clientId => jwtToken.resource_access[clientId] && jwtToken.resource_access[clientId].roles.includes("admin")).join(",").trim()
            return user;
        })
        .filter(user => user.clients.length > 0);

    return context;     
}

/**
 * clientFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const clientFilterHook = async (context, jwtToken) => {
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("list-clients") ||
        jwtToken.resource_access.mdos.roles.includes("assign-roles")
    )) {
        return context;
    }

    // filter out to keep only those who are namespace admin
    context.result = context.result.filter(client => jwtToken.resource_access[client.clientId] && jwtToken.resource_access[client.clientId].roles.includes("admin"));
    return context;
};  

/**
 * clientRoleFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
 const clientRoleFilterHook = async (context, jwtToken) => {
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("list-clients") ||
        jwtToken.resource_access.mdos.roles.includes("assign-roles")
        
    )) {
        return context;
    }

    // filter out to keep only those who are namespace admin
    context.result = context.result.filter(role => jwtToken.resource_access[role.clientId] && jwtToken.resource_access[role.clientId].roles.includes("admin"));
    return context;
}; 

/**
 * userRoleFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
 const userRoleFilterHook = async (context, jwtToken) => {
    if(jwtToken.resource_access.mdos && (
        jwtToken.resource_access.mdos.roles.includes("admin") || 
        jwtToken.resource_access.mdos.roles.includes("list-clients") ||
        jwtToken.resource_access.mdos.roles.includes("assign-roles")
    )) {
        return context;
    }

    // filter out to keep only those who are namespace admin
    context.result = context.result.filter(role => jwtToken.resource_access[role.client] && jwtToken.resource_access[role.client].roles.includes("admin"));
    return context;
}; 

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
        
        // Client find call
        if(context.path == "keycloak" && context.params.query.target == "users") {
            return await userFilterHook(context, jwtToken);
        } 
        else if(context.path == "keycloak" && context.params.query.target == "clients") {
            return await clientFilterHook(context, jwtToken);
        }
        else if(context.path == "keycloak" && context.params.query.target == "client-roles") {
            return await clientRoleFilterHook(context, jwtToken);
        }
        else if(context.path == "keycloak" && context.params.query.target == "user-roles") {
            return await userRoleFilterHook(context, jwtToken);
        }
        else {
            console.log(context.params.query);
        }
        return context;
    };  
}