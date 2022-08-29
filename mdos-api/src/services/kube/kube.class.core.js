const { NotFound, Conflict, Unavailable, Forbidden } = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')
const axios = require('axios')
const CommonCore = require('../common.class.core');

class KubeCore extends CommonCore {

    /**
     * constructor
     * @param {*} app
     */
    constructor(app) {
        super(app);
        this.app = app
    }

    /**
     * clientDoesNotExistCheck
     * @param {*} realm 
     * @param {*} clientId 
     */
    async clientDoesNotExistCheck(realm, clientId) {
        const response = await this.app.get("keycloak").getClients(realm);
        if(response.find(o => o.clientId.toLowerCase() == clientId.toLowerCase())) {
            throw new Conflict("Keycloak client ID already exists");
        }
    }

    /**
     * getEnrichedNamespaces
     * @param {*} realm 
     * @param {*} includeKcClients 
     */
    async getEnrichedNamespaces(realm, includeKcClients) {
        let allNamespaces = await this.app.get('kube').getNamespaces()
        let allClients = null
        if (includeKcClients) {
            const response = await this.app.get('keycloak').getRealms()
            if (!response.find((o) => o.realm.toLowerCase() == realm.toLowerCase())) {
                throw new Unavailable('Keycloak realm does not exists')
            }
            allClients = await this.app.get('keycloak').getClients(realm)
        }

        allNamespaces = allNamespaces
            .map((ns) => {
                return {
                    name: ns.metadata.name,
                    status: ns.status.phase,
                }
            })
            .filter((ns) => !['local-path-storage', 'mdos', 'oauth2-proxy', 'keycloak', 'code-server', 'minio', 'mdos-registry', 'calico-apiserver', 'calico-system', 'tigera-operator', 'kube-node-lease', 'kube-public', 'kube-system', 'default', 'istio-system'].includes(ns.name))

        if (allClients) {
            allNamespaces = allNamespaces.map((ns) => {
                ns.kcClient = allClients.find((kcc) => kcc.clientId == ns.name) ? true : false
                return ns
            })
        }
        return allNamespaces;
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
            if(regSaSecret) {
                const username = JSON.parse(regSaSecret['.dockerconfigjson']).auths[`registry.${process.env.ROOT_DOMAIN}`].username;
                const userObj = await this.app.get("keycloak").getUser(realm, null, username);
                await this.app.get("keycloak").deleteUser(realm, userObj.id);
            }
        } catch (_e) {
            console.log(_e);
        }
    }

    /**
     * createNamespace
     * @param {*} namespace 
     * @returns 
     */
    async createNamespace(namespace) {
        // Create namespace if not exist
        let nsCreated = false;
        if (!(await this.app.get('kube').hasNamespace(namespace.toLowerCase()))) {
            await this.app.get('kube').createNamespace({name: namespace.toLowerCase()})
            nsCreated = true;
        } else {
            throw new Conflict('Namespace already exists')
        }
        return nsCreated;
    }

    /**
     * createKeycloakClientRoles
     * @param {*} realm 
     * @param {*} clientId 
     */
    async createKeycloakClientRoles(realm, clientId) {
        await this.app.service("keycloak").create({
            type: "client-role",
            realm: realm,
            name: "admin",
            clientUuid: clientId
        });
        await this.app.service("keycloak").create({
            type: "client-role",
            realm: realm,
            name: "k8s-write",
            clientUuid: clientId
        });
        await this.app.service("keycloak").create({
            type: "client-role",
            realm: realm,
            name: "k8s-read",
            clientUuid: clientId
        });
        await this.app.service("keycloak").create({
            type: "client-role",
            realm: realm,
            name: "s3-write",
            clientUuid: clientId
        });
        await this.app.service("keycloak").create({
            type: "client-role",
            realm: realm,
            name: "s3-read",
            clientUuid: clientId
        });
        await this.app.service("keycloak").create({
            type: "client-role",
            realm: realm,
            name: "registry-pull",
            clientUuid: clientId
        });
        await this.app.service("keycloak").create({
            type: "client-role",
            realm: realm,
            name: "registry-push",
            clientUuid: clientId
        });
    }

    /**
     * createKeycloakSaForNamespace
     * @param {*} realm 
     * @param {*} clientId 
     * @param {*} clientUuid 
     * @param {*} saUser 
     * @param {*} saPass 
     */
    async createKeycloakSaForNamespace(realm, clientId, clientUuid, saUser, saPass) {
        await this.app.get("keycloak").createUser(realm, saUser, saPass, "");
        const saUsersObj = await this.app.get("keycloak").getUser(realm, null, saUser);
        const roleObj = await this.app.get("keycloak").getClientRole(realm, clientId, "registry-pull");
        await this.app.get("keycloak").createClientRoleBindingForUser(realm, clientUuid, saUsersObj.id, roleObj.id, "registry-pull");
    }
}

module.exports = KubeCore