const errors = require('@feathersjs/errors')

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
 * userSpecificNamespaceFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const userSpecificNamespaceFilterHook = async (context, jwtToken) => {
    if (jwtToken.resource_access.mdos && (jwtToken.resource_access.mdos.roles.includes('admin') || jwtToken.resource_access.mdos.roles.includes('list-namespaces'))) {
        return context
    }
    // filter out to keep only those who are namespace admin
    if(!jwtToken.resource_access[context.result.metadata.name])
        context.result = null
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
 * certManagerIssuersFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const certManagerIssuersFilterHook = async (context, jwtToken) => {
    context.result = context.result.filter((issuer) => issuer.metadata.name != "mdos-issuer")
    if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.includes('admin')) {
        return context
    }
    
    context.result = context.result.filter((issuer) => issuer.kind == "ClusterIssuer" ? true : jwtToken.resource_access[issuer.metadata.namespace])
    return context
}

/**
 * certManagerClusterIssuersFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
 const certManagerClusterIssuersFilterHook = async (context, jwtToken) => {
    context.result = context.result.filter((issuer) => issuer.metadata.name != "mdos-issuer")
    if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.includes('admin')) {
        return context
    }
    context.result = context.result.filter((issuer) => issuer.kind == "ClusterIssuer" ? true : false)
    return context
}

/**
 * tlsSecretFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
 const tlsSecretFilterHook = async (context, jwtToken) => {
    context.result = context.result.filter((secret) => ![
        "longhorn-system", 
        "mdos-registry", 
        "keycloak", 
        "istio-system", 
        "kube-system"
    ].includes(secret.metadata.namespace))

    console.log(context.result)

    if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.includes('admin')) {
        return context
    }
    context.result = context.result.filter((secret) => jwtToken.resource_access[secret.metadata.namespace])
    return context
}

/**
 * secretFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
 const secretFilterHook = async (context, jwtToken) => {
    if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.includes('admin')) {
        return context
    }
    context.result = context.result.filter((secret) => jwtToken.resource_access[secret.metadata.namespace])
    return context
}

/**
 * certificatesFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
 const certificatesFilterHook = async (context, jwtToken) => {
    if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.includes('admin')) {
        return context
    }
    context.result = context.result.filter((secret) => jwtToken.resource_access[secret.metadata.namespace])
    return context
}

/**
 * sharedVolumesFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const sharedVolumesFilterHook = async (context, jwtToken) => {
    if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.includes('admin')) {
        return context
    }
    context.result = context.result.filter((pvc) => jwtToken.resource_access[pvc.metadata.namespace])
    return context
}

/**
 * gatewaysFilterHook
 * @param {*} context 
 * @param {*} jwtToken 
 * @returns 
 */
const gatewaysFilterHook = async (context, jwtToken) => {
    if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.includes('admin')) {
        return context
    }
    context.result = context.result.filter((gateway) => jwtToken.resource_access[gateway.metadata.namespace])
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
        if (process.env.NO_ADMIN_AUTH == 'true' || context.app.get("mdos_framework_only")) return context
        if (context.params.provider != 'rest')
            // Internal calls don't need authentication
            return context
        if (!context.params.headers['authorization']) throw new errors.Forbidden('ERROR: You are not authenticated')

        // Get JWT token
        let jwtToken
        if(context.jwtToken) {
            jwtToken = context.jwtToken
        } else {
            let access_token = context.params.headers['authorization'].split(" ")[1]
            if (access_token.slice(-1) === ';') {
                access_token = access_token.substring(0, access_token.length-1)
            }
            jwtToken = await context.app.get('keycloak').userTokenInstrospect('mdos', access_token, true)
            if(!jwtToken.active) {
                throw new errors.Forbidden('ERROR: Authentication session timeout')
            }
        }
        
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
        } else if (context.path == 'kube' && context.params.query.target == 'namespace') {
            return await userSpecificNamespaceFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'applications') {
            return await userApplicationsFilterHook(context, jwtToken)
        } else if (context.path == 'oidc-provider' && !context.params.query.target) {
            return await oidcProviderFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'cm-issuers') {
            return await certManagerIssuersFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'cm-cluster-issuers') {
            return await certManagerClusterIssuersFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'tls-secrets') {
            return await tlsSecretFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'secrets') {
            return await secretFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'certificates') {
            return await certificatesFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'shared-volumes') {
            return await sharedVolumesFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'volumes') {
            return await sharedVolumesFilterHook(context, jwtToken)
        } else if (context.path == 'kube' && context.params.query.target == 'gateways') {
            return await gatewaysFilterHook(context, jwtToken)
        } else {
            console.log('Unknown filter hook: ', context.params.query, context.path)
        }
        return context
    }
}
