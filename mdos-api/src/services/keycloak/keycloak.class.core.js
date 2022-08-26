const { Conflict, Unavailable } = require('@feathersjs/errors');
const CommonCore = require('../common.class.core');

class KeycloakCore extends CommonCore {

    /**
     * constructor
     * @param {*} app 
     */
    constructor(app) {
        super(app);
        this.app = app;
    }

    /**
     * userCheck
     * @param {*} realm 
     * @param {*} username 
     * @param {*} email 
     */
     async userDoesNotExistCheck(realm, username, email) {
        // Make sure username exists
        const response = await this.app.get("keycloak").getUsers(realm);
        if(response.find(o => o.username.toLowerCase() == username.toLowerCase() || o.email.toLowerCase() == email.toLowerCase())) {
            throw new Conflict("Keycloak username already exists");
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
        const userRolesResponse = await this.app.get("keycloak").getUserRoles(realm, username)
        const existingMappingsForClient = userRolesResponse.clientMappings ? userRolesResponse.clientMappings[clientName] : null;
        if(existingMappingsForClient && existingMappingsForClient.mappings.find((m) => m.name == roleName)) {
            throw new Conflict("Client role is already added for this user");
        }
    }

    /**
     * getClients
     * @param {*} realm 
     * @returns 
     */
     async getClients(realm) {
        const clients = await this.app.get("keycloak").getClients(realm);
        return clients.filter(c => ![  
            "realm-management",
            "broker",
            "mdos",
            "account",
            "account-console",
            "admin-cli",
            "security-admin-console",
            "cs"
        ].includes(c.clientId));
    }

    /**
     * getClientRoles
     * @param {*} realm 
     * @param {*} clientId 
     * @param {*} filterProtected 
     * @returns 
     */
    async getClientRoles(realm, clientId, filterProtected) {
        const clientRoles = await this.app.get("keycloak").getClientRoles(realm, clientId);
        if(filterProtected == "true") 
            return clientRoles.filter(cr => ["uma_protection", "admin", "k8s-read", "k8s-write", "s3-read", "s3-write", "registry-pull", "registry-push"].indexOf(cr.name) == -1);
        else
            return clientRoles.filter(cr => !["uma_protection"].includes(cr.name));
    }

    /**
     * getUserRoles
     * @param {*} realm 
     * @param {*} username 
     * @returns 
     */
    async getUserRoles(realm, username) {
        let roles = await this.app.get("keycloak").getUserRoles(realm, username);
        const mapping = [];
        Object.keys(roles.clientMappings).forEach((key) => {
            roles.clientMappings[key].mappings.forEach((cm) => {
                mapping.push({
                    client: key,
                    uuid: cm.id,
                    name: cm.name
                });
            });
        });

        return mapping.filter(m => ![  
            "uma_protection"
        ].includes(m.name));
    }
}

module.exports = KeycloakCore