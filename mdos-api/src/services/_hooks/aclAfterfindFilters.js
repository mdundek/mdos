const errors = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')

/**
 * userFilterHook
 * @param {*} context
 * @param {*} jwtToken
 * @returns
 */
const userFilterHook = (context, jwtToken) => {
    // If mdos admin or list-user
    if (
        jwtToken.resource_access.mdos &&
        (jwtToken.resource_access.mdos.roles.includes('admin') || jwtToken.resource_access.mdos.roles.includes('list-users') || jwtToken.resource_access.mdos.roles.includes('assign-roles'))
    ) {
        return context
    }

    // If namespace admin
    context.result = context.result
        .map((user) => {
            user.clients = user.clients
                .split(',')
                .filter((clientId) => jwtToken.resource_access[clientId] && jwtToken.resource_access[clientId].roles.includes('admin'))
                .join(',')
                .trim()
            return user
        })
        .filter((user) => user.clients.length > 0)

    return context
}

/**
 * clientFilterHook
 * @param {*} context
 * @param {*} jwtToken
 * @returns
 */
const clientFilterHook = async (context, jwtToken) => {
    if (
        jwtToken.resource_access.mdos &&
        (jwtToken.resource_access.mdos.roles.includes('admin') || jwtToken.resource_access.mdos.roles.includes('list-clients') || jwtToken.resource_access.mdos.roles.includes('assign-roles'))
    ) {
        return context
    }

    // filter out to keep only those who are namespace admin
    context.result = context.result.filter((client) => jwtToken.resource_access[client.clientId] && jwtToken.resource_access[client.clientId].roles.includes('admin'))
    return context
}

/**
 * clientRoleFilterHook
 * @param {*} context
 * @param {*} jwtToken
 * @returns
 */
const clientRoleFilterHook = async (context, jwtToken) => {
    if (
        jwtToken.resource_access.mdos &&
        (jwtToken.resource_access.mdos.roles.includes('admin') || jwtToken.resource_access.mdos.roles.includes('list-clients') || jwtToken.resource_access.mdos.roles.includes('assign-roles'))
    ) {
        return context
    }

    // filter out to keep only those who are namespace admin
    context.result = context.result.filter((role) => jwtToken.resource_access[role.clientId] && jwtToken.resource_access[role.clientId].roles.includes('admin'))
    return context
}

/**
 * userRoleFilterHook
 * @param {*} context
 * @param {*} jwtToken
 * @returns
 */
const userRoleFilterHook = async (context, jwtToken) => {
    if (
        jwtToken.resource_access.mdos &&
        (jwtToken.resource_access.mdos.roles.includes('admin') || jwtToken.resource_access.mdos.roles.includes('list-clients') || jwtToken.resource_access.mdos.roles.includes('assign-roles'))
    ) {
        return context
    }

    // filter out to keep only those who are namespace admin
    context.result = context.result.filter((role) => jwtToken.resource_access[role.client] && jwtToken.resource_access[role.client].roles.includes('admin'))
    return context
}

/**
 * userNamespaceFilterHook
 * @param {*} context
 * @param {*} jwtToken
 * @returns
 */
const userNamespaceFilterHook = async (context, jwtToken) => {
    if (jwtToken.resource_access.mdos && (jwtToken.resource_access.mdos.roles.includes('admin') || jwtToken.resource_access.mdos.roles.includes('list-namespaces'))) {
        return context
    }

    // filter out to keep only those who are namespace admin
    context.result = context.result.filter((ns) => jwtToken.resource_access[ns.name])
    return context
}

/**
 * userApplicationsFilterHook
 * @param {*} context
 * @param {*} jwtToken
 * @returns
 */
const userApplicationsFilterHook = async (context, jwtToken) => {
    if (jwtToken.resource_access.mdos && (jwtToken.resource_access.mdos.roles.includes('admin') || jwtToken.resource_access.mdos.roles.includes('list-namespaces'))) {
        return context
    }

    // filter out to keep only those who are namespace admin
    context.result = context.result.filter(
        (app) =>
            jwtToken.resource_access[app.namespace] &&
            (jwtToken.resource_access[app.namespace].roles.includes('admin') ||
                jwtToken.resource_access[app.namespace].roles.includes('k8s-read') ||
                jwtToken.resource_access[app.namespace].roles.includes('k8s-write'))
    )
    return context
}

/**
 * oidcProviderFilterHook
 * @param {*} context
 * @param {*} jwtToken
 * @returns
 */
const oidcProviderFilterHook = async (context, jwtToken) => {
    if (jwtToken.resource_access.mdos && (jwtToken.resource_access.mdos.roles.includes('admin') || jwtToken.resource_access.mdos.roles.includes('list-namespaces'))) {
        return context
    }

    context.result = context.result.filter((oidc) => {
        let nsName = oidc.name.split('-')
        nsName.shift()
        nsName = nsName.join('-')
        return jwtToken.resource_access[nsName]
    })
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
        if (!context.params.headers['x-auth-request-access-token']) throw new errors.Forbidden('You are not authenticated')

        let jwtToken = jwt_decode(context.params.headers['x-auth-request-access-token'])

        // Client find call
        if (context.path == 'keycloak' && context.params.query.target == 'users') {
            return await userFilterHook(context, jwtToken)
        } else if (context.path == 'keycloak' && context.params.query.target == 'clients') {
            return await clientFilterHook(context, jwtToken)
        } else if (context.path == 'keycloak' && context.params.query.target == 'client-roles') {
            return await clientRoleFilterHook(context, jwtToken)
        } else if (context.path == 'keycloak' && context.params.query.target == 'user-roles') {
            return await userRoleFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'namespaces') {
            return await userNamespaceFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'applications') {
            return await userApplicationsFilterHook(context, jwtToken)
        } else if (context.path == 'oidc-provider' && !context.params.query.target) {
            return await oidcProviderFilterHook(context, jwtToken)
        } else {
            console.log('Unknown: ', context.params.query, context.path)
        }
        return context
    }
}
