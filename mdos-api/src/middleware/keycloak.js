const axios = require('axios')
const https = require('https')
const YAML = require('yaml')
const fs = require('fs')
const jwt_decode = require('jwt-decode')
var jwt = require('jwt-simple')
const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')
const { terminalCommand } = require('../libs/terminal')

axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
})

/**
 * Keycloak specific functions
 *
 * @class Keycloak
 */
class Keycloak {
    
    /**
     * Creates an instance of Keycloak.
     * @param {*} app
     * @memberof Keycloak
     */
    constructor(app) {
        this.app = app

        this.rootDomain = process.env.ROOT_DOMAIN
        this.sslCertFolder = process.env.SSL_CERT_FOLDER

        this.regUser = process.env.REG_USER
        this.regPass = process.env.REG_PASS
    }

    /**
     *
     *
     * @return {*} 
     * @memberof Keycloak
     */
    async isKeycloakDeployed() {
        return await this.app.get('kube').hasNamespace('keycloak')
    }

    
    /**
     *
     *
     * @param {*} realm
     * @param {*} username
     * @memberof Keycloak
     */
    async logout(realm, username) {
        let accessToken = await this._getAccessToken()

        try {
            const user = await this.getUser(realm, null, username)

            await axios.post(
                `https://keycloak.${this.rootDomain}/admin/realms/${realm}/users/${user.id}/logout`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            )
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    /**
     *
     *
     * @return {*} 
     * @memberof Keycloak
     */
    async _getAccessToken() {
        const keycloakSecret = await this.app.get('kube').getSecret('keycloak', 'admin-creds')
        const kcAuthResponse = await terminalCommand(`curl -s -k -X POST \
            "https://keycloak.${this.rootDomain}/realms/master/protocol/openid-connect/token" \
            -H "Content-Type: application/x-www-form-urlencoded"  \
            -d "grant_type=client_credentials" \
            -d "client_id=master-realm" \
            -d "client_secret=${keycloakSecret.clientSecret}" \
            -d "username=${keycloakSecret.username}"  \
            -d "password=${keycloakSecret.password}" \
            -d "scope=openid"`)
        return JSON.parse(kcAuthResponse[0]).access_token
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} username
     * @param {*} password
     * @return {*} 
     * @memberof Keycloak
     */
    async getUserAccessToken(realm, username, password) {
        const kcAuthResponse = await terminalCommand(`curl -s -k -X POST \
            "https://keycloak.${this.rootDomain}/realms/${realm}/protocol/openid-connect/token" \
            -H "Content-Type: application/x-www-form-urlencoded"  \
            -d "grant_type=password" \
            -d "client_id=admin-cli" \
            -d "username=${username}"  \
            -d "password=${password}"`)
        return JSON.parse(kcAuthResponse[0])
    }

    /**
     *
     *
     * @return {*} 
     * @memberof Keycloak
     */
    async getRealms() {
        let accessToken = await this._getAccessToken()
        const response = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })
        return response.data
    }

    /**
     *
     *
     * @param {*} realm
     * @memberof Keycloak
     */
    async createRealm(realm) {
        let accessToken = await this._getAccessToken()
        const responseRealm = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        if (!responseRealm.data.find((r) => r.realm == realm)) {
            await axios.post(
                `https://keycloak.${this.rootDomain}/admin/realms`,
                {
                    id: realm,
                    realm: realm,
                    rememberMe: true,
                    enabled: true,
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            )
        }
    }

    /**
     *
     *
     * @param {*} realm
     * @return {*} 
     * @memberof Keycloak
     */
    async getClients(realm) {
        let accessToken = await this._getAccessToken()
        const response = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/clients`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })
        return response.data.map((o) => {
            o.realm = realm
            return o
        })
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientId
     * @return {*} 
     * @memberof Keycloak
     */
    async getClient(realm, clientId) {
        const response = await this.getClients(realm)
        return response.find((o) => o.clientId == clientId)
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientId
     * @memberof Keycloak
     */
    async createClient(realm, clientId) {
        let accessToken = await this._getAccessToken()

        await axios.post(
            `https://keycloak.${this.rootDomain}/admin/realms/${realm}/clients`,
            {
                clientId: clientId,
                rootUrl: '',
                baseUrl: '',
                surrogateAuthRequired: false,
                enabled: true,
                alwaysDisplayInConsole: false,
                clientAuthenticatorType: 'client-secret',
                redirectUris: ['*'],
                webOrigins: [],
                notBefore: 0,
                bearerOnly: false,
                consentRequired: false,
                standardFlowEnabled: true,
                implicitFlowEnabled: false,
                directAccessGrantsEnabled: true,
                serviceAccountsEnabled: true,
                authorizationServicesEnabled: true,
                publicClient: false,
                frontchannelLogout: false,
                protocol: 'openid-connect',
                attributes: {
                    'saml.multivalued.roles': 'false',
                    'saml.force.post.binding': 'false',
                    'frontchannel.logout.session.required': 'false',
                    'oauth2.device.authorization.grant.enabled': 'true',
                    'backchannel.logout.revoke.offline.tokens': 'false',
                    'saml.server.signature.keyinfo.ext': 'false',
                    'use.refresh.tokens': 'true',
                    'oidc.ciba.grant.enabled': 'false',
                    'backchannel.logout.session.required': 'true',
                    'client_credentials.use_refresh_token': 'false',
                    'saml.client.signature': 'false',
                    'require.pushed.authorization.requests': 'false',
                    'saml.allow.ecp.flow': 'false',
                    'saml.assertion.signature': 'false',
                    'id.token.as.detached.signature': 'false',
                    'saml.encrypt': 'false',
                    'saml.server.signature': 'false',
                    'exclude.session.state.from.auth.response': 'false',
                    'saml.artifact.binding': 'false',
                    saml_force_name_id_format: 'false',
                    'tls.client.certificate.bound.access.tokens': 'false',
                    'acr.loa.map': '{}',
                    'saml.authnstatement': 'false',
                    'display.on.consent.screen': 'false',
                    'token.response.type.bearer.lower-case': 'false',
                    'saml.onetimeuse.condition': 'false',
                },
                authenticationFlowBindingOverrides: {},
                fullScopeAllowed: true,
                nodeReRegistrationTimeout: -1,
                protocolMappers: [
                    {
                        name: 'Client ID',
                        protocol: 'openid-connect',
                        protocolMapper: 'oidc-usersessionmodel-note-mapper',
                        consentRequired: false,
                        config: {
                            'user.session.note': 'clientId',
                            'id.token.claim': 'true',
                            'access.token.claim': 'true',
                            'claim.name': 'clientId',
                            'jsonType.label': 'String',
                        },
                    },
                    {
                        name: 'Client Host',
                        protocol: 'openid-connect',
                        protocolMapper: 'oidc-usersessionmodel-note-mapper',
                        consentRequired: false,
                        config: {
                            'user.session.note': 'clientHost',
                            'id.token.claim': 'true',
                            'access.token.claim': 'true',
                            'claim.name': 'clientHost',
                            'jsonType.label': 'String',
                        },
                    },
                    {
                        name: 'Client IP Address',
                        protocol: 'openid-connect',
                        protocolMapper: 'oidc-usersessionmodel-note-mapper',
                        consentRequired: false,
                        config: {
                            'user.session.note': 'clientAddress',
                            'id.token.claim': 'true',
                            'access.token.claim': 'true',
                            'claim.name': 'clientAddress',
                            'jsonType.label': 'String',
                        },
                    },
                ],
                defaultClientScopes: ['web-origins', 'acr', 'profile', 'roles', 'email'],
                optionalClientScopes: ['address', 'phone', 'offline_access', 'microprofile-jwt'],
                access: {
                    view: true,
                    configure: true,
                    manage: true,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            }
        )
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientUuid
     * @memberof Keycloak
     */
    async deleteClient(realm, clientUuid) {
        let accessToken = await this._getAccessToken()

        const allclients = await this.getClients(realm)
        const clientInst = allclients.find((o) => o.id == clientUuid)

        if (!clientInst) throw new NotFound('Client UUID not found')

        await axios.delete(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/clients/${clientUuid}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientUuid
     * @param {*} name
     * @memberof Keycloak
     */
    async createClientRole(realm, clientUuid, name) {
        let accessToken = await this._getAccessToken()

        try {
            const allclients = await this.getClients(realm)
            const clientInst = allclients.find((o) => o.id == clientUuid)

            if (!clientInst) throw new NotFound('Client UUID not found')

            await axios.post(
                `https://keycloak.${this.rootDomain}/admin/realms/${realm}/clients/${clientUuid}/roles`,
                {
                    id: `${clientInst.clientId}_${name}`,
                    name: name,
                    clientRole: true,
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            )
        } catch (error) {
            // console.log(error);
            throw error
        }
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientUuid
     * @param {*} name
     * @memberof Keycloak
     */
    async removeClientRole(realm, clientUuid, name) {
        let accessToken = await this._getAccessToken()
        await axios.delete(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/clients/${clientUuid}/roles/${name}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientId
     * @return {*} 
     * @memberof Keycloak
     */
    async getClientRoles(realm, clientId) {
        let accessToken = await this._getAccessToken()
        let response = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/clients?clientId=${clientId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        if (response.data.length == 0) {
            throw new NotFound('Keycloak client not found')
        }

        response = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/clients/${response.data[0].id}/roles`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        return response.data.map((r) => {
            r.clientId = clientId
            return r
        })
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientId
     * @param {*} roleName
     * @return {*} 
     * @memberof Keycloak
     */
    async getClientRole(realm, clientId, roleName) {
        const clientRoles = await this.getClientRoles(realm, clientId)
        return clientRoles.find((o) => o.name == roleName)
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} username
     * @return {*} 
     * @memberof Keycloak
     */
    async getUserRoles(realm, username) {
        let accessToken = await this._getAccessToken()

        let response = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/users?username=${username}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        if (response.data.length == 0) {
            throw new NotFound('Keycloak username not found')
        }

        let userRoleMappingsResponse = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/users/${response.data[0].id}/role-mappings`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        return userRoleMappingsResponse.data
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientId
     * @return {*} 
     * @memberof Keycloak
     */
    async getUsers(realm, clientId) {
        let accessToken = await this._getAccessToken()

        const response = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/users`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        if (!clientId) {
            for (let user of response.data) {
                const clientRoleMappingsResponse = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/users/${user.id}/role-mappings`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                })
                user.clients = clientRoleMappingsResponse.data.clientMappings ? Object.keys(clientRoleMappingsResponse.data.clientMappings).join(', ') : ''
            }
            return response.data
        } else {
            const filteredUsers = []
            for (let user of response.data) {
                const clientRoleMappingsResponse = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/users/${user.id}/role-mappings`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                })

                if (clientRoleMappingsResponse.data.clientMappings) {
                    if (Object.keys(clientRoleMappingsResponse.data.clientMappings).find((c) => c == clientId)) {
                        user.clients = Object.keys(clientRoleMappingsResponse.data.clientMappings).join(', ')
                        filteredUsers.push(user)
                    }
                }
            }
            return filteredUsers
        }
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientId
     * @param {*} username
     * @return {*} 
     * @memberof Keycloak
     */
    async getUser(realm, clientId, username) {
        const clientUsers = await this.getUsers(realm, clientId)
        return clientUsers.find((u) => u.username == username)
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} userName
     * @param {*} password
     * @param {*} email
     * @memberof Keycloak
     */
    async createUser(realm, userName, password, email) {
        let accessToken = await this._getAccessToken()

        await axios.post(
            `https://keycloak.${this.rootDomain}/admin/realms/${realm}/users`,
            {
                username: userName,
                enabled: true,
                totp: false,
                emailVerified: true,
                email: email,
                disableableCredentialTypes: [],
                requiredActions: [],
                notBefore: 0,
                access: {
                    manageGroupMembership: true,
                    view: true,
                    mapRoles: true,
                    impersonate: true,
                    manage: true,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            }
        )

        const responseAllUsers = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/users`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        const userUuid = responseAllUsers.data.find((u) => u.username == userName).id
        accessToken = await this._getAccessToken()

        await axios.put(
            `https://keycloak.${this.rootDomain}/admin/realms/mdos/users/${userUuid}/reset-password`,
            {
                type: 'password',
                value: password,
                temporary: false,
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            }
        )
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} userId
     * @memberof Keycloak
     */
    async deleteUser(realm, userId) {
        let accessToken = await this._getAccessToken()

        await axios.delete(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/users/${userId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientId
     * @return {*} 
     * @memberof Keycloak
     */
    async getClientSecret(realm, clientId) {
        let accessToken = await this._getAccessToken()
        const responseClient = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/clients?clientId=${clientId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        const responseClientSecret = await axios.get(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/clients/${responseClient.data[0].id}/client-secret`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        return responseClientSecret.data.value
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientUuid
     * @param {*} userUuid
     * @param {*} roleUuid
     * @param {*} roleName
     * @memberof Keycloak
     */
    async createClientRoleBindingForUser(realm, clientUuid, userUuid, roleUuid, roleName) {
        let accessToken = await this._getAccessToken()
        await axios.post(
            `https://keycloak.${this.rootDomain}/admin/realms/${realm}/users/${userUuid}/role-mappings/clients/${clientUuid}`,
            [
                {
                    id: roleUuid,
                    name: roleName,
                },
            ],
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            }
        )
    }

    /**
     *
     *
     * @param {*} realm
     * @param {*} clientUuid
     * @param {*} userUuid
     * @param {*} roleName
     * @param {*} roleUuid
     * @memberof Keycloak
     */
    async removeClientRoleBindingFromUser(realm, clientUuid, userUuid, roleName, roleUuid) {
        let accessToken = await this._getAccessToken()
        await axios.delete(`https://keycloak.${this.rootDomain}/admin/realms/${realm}/users/${userUuid}/role-mappings/clients/${clientUuid}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            data: [
                {
                    id: roleUuid,
                    name: roleName,
                },
            ],
        })
    }

    /**
     * directLogin
     * 
     * @param {*} realm 
     * @param {*} username 
     * @param {*} password 
     * @returns 
     */
    async directLogin(realm, username, password) {
        const authResponse = await this.getUserAccessToken(realm, username, password);
        if(authResponse.access_token) {
            let jwtToken = jwt_decode(authResponse.access_token);
            if(!jwtToken.resource_access) {
                jwtToken.resource_access = {};
                const userRoles = await this.getUserRoles(realm, username)
                const clients = Object.keys(userRoles.clientMappings);
                for(const client of clients) {
                    jwtToken.resource_access[client] = {
                        roles: userRoles.clientMappings[client].mappings.map(rm => rm.name)
                    }
                }
            }
            authResponse.access_token = jwt.encode(jwtToken, Buffer.from('fe1a1915a379f3be5394b64d14794932', 'hex'));
        }
        return authResponse;
    }
}

module.exports = Keycloak
