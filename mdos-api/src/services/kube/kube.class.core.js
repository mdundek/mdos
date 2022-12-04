const { NotFound, Conflict, Unavailable, Forbidden, BadRequest } = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')
const axios = require('axios')
const Constants = require('../../libs/constants');
const CommonCore = require('../common.class.core')

/**
 * Kube core functions class
 *
 * @class KubeCore
 * @extends {CommonCore}
 */
class KubeCore extends CommonCore {
    /**
     * constructor
     * @param {*} app
     */
    constructor(app) {
        super(app)
        this.app = app
    }

    /**
     * getMdosApplications
     * @param {*} clientId
     */
    async getMdosApplications(clientId) {
        let nsApps = await this.app.get('kube').getApplicationDeployments(clientId == "*" ? "" : clientId)
        const apps = []
        for (const dep of nsApps.items) {
            if (dep.metadata.annotations && dep.metadata.annotations['meta.helm.sh/release-name']) {
                if (!apps.find((a) => a.isHelm && a.name == dep.metadata.annotations['meta.helm.sh/release-name'])) {
                    const chartValues = await this.app.get('kube').getHelmChartValues(dep.metadata.namespace, dep.metadata.annotations['meta.helm.sh/release-name'])
                    apps.push({
                        isHelm: true,
                        type: 'deployment',
                        name: dep.metadata.annotations['meta.helm.sh/release-name'],
                        namespace: dep.metadata.namespace,
                        values: chartValues,
                    })
                }
            } else if (!apps.find((a) => a.name == dep.metadata.name)) {
                apps.push({
                    isHelm: false,
                    type: 'deployment',
                    name: dep.metadata.name,
                    namespace: dep.metadata.namespace,
                })
            }
        }

        nsApps = await this.app.get('kube').getApplicationStatefulSets(clientId == "*" ? "" : clientId)
        for (const dep of nsApps.items) {
            if (dep.metadata.annotations && dep.metadata.annotations['meta.helm.sh/release-name']) {
                if (!apps.find((a) => a.isHelm && a.name == dep.metadata.annotations['meta.helm.sh/release-name'])) {
                    apps.push({
                        isHelm: true,
                        type: 'statefulSet',
                        name: dep.metadata.annotations['meta.helm.sh/release-name'],
                        namespace: dep.metadata.namespace,
                    })
                }
            } else if (!apps.find((a) => a.name == dep.metadata.name)) {
                apps.push({
                    isHelm: false,
                    type: 'statefulSet',
                    name: dep.metadata.name,
                    namespace: dep.metadata.namespace,
                })
            }
        }
        return apps
    }

    /**
     * deleteApplication
     * @param {*} namespace
     * @param {*} name
     * @param {*} isHelm
     * @param {*} type
     */
    async deleteApplication(namespace, name, isHelm, type) {
        if (isHelm) {
            await this.app.get('kube').helmUninstall(namespace, name)
        } else if (type == 'deployment') {
            await this.app.get('kube').deleteDeployment(namespace, name)
        } else if (type == 'statefulSet') {
            await this.app.get('kube').deleteStatefulSet(namespace, name)
        } else {
            throw new BadRequest('ERROR: Application type not recognized')
        }
    }

    /**
     * clientDoesNotExistCheck
     * @param {*} realm
     * @param {*} clientId
     */
    async clientDoesNotExistCheck(realm, clientId) {
        const response = await this.app.get('keycloak').getClients(realm)
        if (response.find((o) => o.clientId.toLowerCase() == clientId.toLowerCase())) {
            throw new Conflict('ERROR: Keycloak client ID already exists')
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
                throw new Unavailable('ERROR: Keycloak realm does not exists')
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
            .filter(
                (ns) =>
                    !Constants.RESERVED_NAMESPACES.includes(ns.name)
            )

        if (allClients) {
            allNamespaces = allNamespaces.map((ns) => {
                ns.kcClient = allClients.find((kcc) => kcc.clientId == ns.name) ? true : false
                return ns
            })
        }
        return allNamespaces
    }

    /**
     * createNamespace
     * @param {*} namespace
     * @returns
     */
    async createNamespace(namespace) {
        // Create namespace if not exist
        let nsCreated = false
        if (!(await this.app.get('kube').hasNamespace(namespace.toLowerCase()))) {
            await this.app.get('kube').createNamespace({ name: namespace.toLowerCase() })
            nsCreated = true
        } else {
            throw new Conflict('ERROR: Namespace already exists')
        }
        return nsCreated
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
        await this.app.get('keycloak').createUser(realm, saUser, saPass, '')
        const saUsersObj = await this.app.get('keycloak').getUser(realm, null, saUser)
        const roleObj = await this.app.get('keycloak').getClientRole(realm, clientId, 'registry-pull')
        await this.app.get('keycloak').createClientRoleBindingForUser(realm, clientUuid, saUsersObj.id, roleObj.id, 'registry-pull')
    }
}

module.exports = KubeCore
