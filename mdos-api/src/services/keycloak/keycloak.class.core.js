const { Conflict, Unavailable } = require('@feathersjs/errors')
const CommonCore = require('../common.class.core')

/**
 * Keycloak core functions class
 *
 * @class KubeCore
 * @extends {CommonCore}
 */
class KeycloakCore extends CommonCore {
    /**
     * constructor
     * @param {*} app
     */
    constructor(app) {
        super(app)
        this.app = app
    }

    /**
     * userCheck
     * @param {*} realm
     * @param {*} username
     * @param {*} email
     */
    async userDoesNotExistCheck(realm, username, email) {
        // Make sure username exists
        const response = await this.app.get('keycloak').getUsers(realm)
        if (response.find((o) => o.username.toLowerCase() == username.toLowerCase() || (o.email && o.email.toLowerCase() == email.toLowerCase()))) {
            throw new Conflict('ERROR: Keycloak username already exists')
        }
    }

    /**
     * userDoesNotHaveRoleCheck
     * @param {*} realm
     * @param {*} username
     * @param {*} clientName
     * @param {*} roleName
     */
    async userDoesNotHaveRoleCheck(realm, username, clientName, roleName) {
        // Make sure user does not already have this client role binding
        const userRolesResponse = await this.app.get('keycloak').getUserRoles(realm, username)
        const existingMappingsForClient = userRolesResponse.clientMappings ? userRolesResponse.clientMappings[clientName] : null
        if (existingMappingsForClient && existingMappingsForClient.mappings.find((m) => m.name == roleName)) {
            throw new Conflict('ERROR: Client role is already added for this user')
        }
    }

    /**
     * getClients
     * @param {*} realm
     * @param {*} includeMdosClient
     * @returns
     */
    async getClients(realm, includeMdosClient) {
        const clients = await this.app.get('keycloak').getClients(realm)
        const excludeClients = ['realm-management', 'broker', 'account', 'account-console', 'admin-cli', 'security-admin-console', 'cs']
        if (!includeMdosClient) excludeClients.push('mdos')
        return clients.filter((c) => !excludeClients.includes(c.clientId))
    }

    /**
     * getClientRoles
     * @param {*} realm
     * @param {*} clientId
     * @param {*} filterProtected
     * @returns
     */
    async getClientRoles(realm, clientId, filterProtected) {
        const clientRoles = await this.app.get('keycloak').getClientRoles(realm, clientId)
        if (filterProtected == 'true') return clientRoles.filter((cr) => ['uma_protection', 'admin', 'k8s-read', 'k8s-write', 'ftp-write', 'registry-push'].indexOf(cr.name) == -1)
        else return clientRoles.filter((cr) => !['uma_protection'].includes(cr.name))
    }

    /**
     * getUserRoles
     * @param {*} realm
     * @param {*} username
     * @returns
     */
    async getUserRoles(realm, username) {
        let roles = await this.app.get('keycloak').getUserRoles(realm, username)
        const mapping = []
        if (roles.clientMappings) {
            Object.keys(roles.clientMappings).forEach((key) => {
                roles.clientMappings[key].mappings.forEach((cm) => {
                    mapping.push({
                        client: key,
                        uuid: cm.id,
                        name: cm.name,
                    })
                })
            })
        }
        return mapping.filter((m) => !['uma_protection'].includes(m.name))
    }

    /**
     * createKeycloakClientRoles
     * @param {*} realm
     * @param {*} clientId
     */
    async createKeycloakClientRoles(realm, clientId) {
        await this.app.service('keycloak').create({
            type: 'client-role',
            realm: realm,
            name: 'admin',
            clientUuid: clientId,
        })
        await this.app.service('keycloak').create({
            type: 'client-role',
            realm: realm,
            name: 'k8s-write',
            clientUuid: clientId,
        })
        await this.app.service('keycloak').create({
            type: 'client-role',
            realm: realm,
            name: 'k8s-read',
            clientUuid: clientId,
        })
        await this.app.service('keycloak').create({
            type: 'client-role',
            realm: realm,
            name: 'ftp-write',
            clientUuid: clientId,
        })
        await this.app.service('keycloak').create({
            type: 'client-role',
            realm: realm,
            name: 'registry-pull',
            clientUuid: clientId,
        })
        await this.app.service('keycloak').create({
            type: 'client-role',
            realm: realm,
            name: 'registry-push',
            clientUuid: clientId,
        })
    }

    /**
     * deleteKeycloakSAUser
     * @param {*} realm
     * @param {*} namespace
     */
    async deleteKeycloakSAUser(realm, namespace) {
        // Delete SA keycloak user
        try {
            const regSaSecret = await this.app.get('kube').getSecret(namespace, 'mdos-regcred')
            if (regSaSecret) {
                const username = JSON.parse(regSaSecret['.dockerconfigjson']).auths[`registry.${process.env.ROOT_DOMAIN}`].username
                const userObj = await this.app.get('keycloak').getUser(realm, null, username)
                await this.app.get('keycloak').deleteUser(realm, userObj.id)
            }
        } catch (_e) {
            console.log(_e)
        }
    }
}

module.exports = KeycloakCore
