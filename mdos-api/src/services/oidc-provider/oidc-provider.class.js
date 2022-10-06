const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')
const OidcProviderCore = require('./oidc-provider.class.core')
const { CHANNEL } = require('../../middleware/rb-broker/constant');

/* eslint-disable no-unused-vars */
exports.OidcProvider = class OidcProvider extends OidcProviderCore {

    /**
     * Creates an instance of OidcProvider.
     * @param {*} options
     * @param {*} app
     */
    constructor(options, app) {
        super(app)
        this.options = options || {}
        this.app = app
    }

    /**
     * Create
     *
     * @param {*} body
     * @param {*} params
     * @return {*} 
     */
    async create(body, params) {
        if (body.type == 'keycloak') {
            // Make sure keycloak is deployed
            await this.keycloakInstallCheck()

            // Make sure OIDC provider does not already exist
            await this.ensureProviderNotDeclared(body.data.name)

            // Make sure client ID exists
            await this.clientIdCheck(body.realm, body.data.clientId)

            // Kick off event driven workflow
            const result = await this.app.get('subscriptionManager').workflowCall(CHANNEL.JOB_K3S_INSTALL_OAUTH_PROXY, {
                context: {
                    oidcTarget: "keycloak",
                    realm: body.realm,
                    providerName: body.data.name,
                    kcClientId: body.data.clientId,
                    rollback: false
                },
                workflow: [
                    {
                        topic: CHANNEL.JOB_K3S_INSTALL_OAUTH_PROXY,
                        status: "PENDING",
                        milestone: 1
                    },
                    {
                        topic: CHANNEL.JOB_K3S_ADD_ISTIO_OIDC_PROVIDER,
                        status: "PENDING",
                        milestone: 2
                    }
                ],
                rollbackWorkflow: [
                    {
                        topic: CHANNEL.JOB_K3S_UNINSTALL_OAUTH_PROXY,
                        status: "PENDING",
                        milestone: 1
                    }
                ]
            })

            // Check if error occured or not
            if(result.context.rollback) {
                console.error(result.workflow)
                const errorJob = result.workflow.find(job => job.status  == "ERROR")
                if(errorJob && errorJob.errorMessage) {
                    throw new Error("ERROR: " + errorJob.errorMessage)
                } else {
                    throw new Error("ERROR: An unknown error occured")
                }
            }

            // // Deploy OAuth2 proxy
            // await this.app.get('kube').deployOauth2Proxy('keycloak', body.realm, body.data.name, body.data.clientId)

            // // Add provider config to Istio
            // try {
            //     await this.app.get('kube').addIstiodOidcProvider(body.data.name)
            // } catch (error) {
            //     // Cleanup
            //     try {
            //         await this.app.get('kube').uninstallOauth2Proxy(body.data.name)
            //     } catch (_e) {}
            //     throw error
            // }
        } else {
            throw new Unavailable('ERROR: Provider type not implemented yet')
        }
        return body
    }

    /**
     * Remove
     *
     * @param {*} id
     * @param {*} params
     * @return {*} 
     */
    async remove(id, params) {
        await this.oidcProviderCheck(id)

        // Kick off event driven workflow
        const result = await this.app.get('subscriptionManager').workflowCall(CHANNEL.JOB_K3S_UNINSTALL_OAUTH_PROXY, {
            context: {
                providerName: body.data.name,
                rollback: false
            },
            workflow: [
                {
                    topic: CHANNEL.JOB_K3S_UNINSTALL_OAUTH_PROXY,
                    status: "PENDING",
                    milestone: 1
                },
                {
                    topic: CHANNEL.JOB_K3S_REMOVE_ISTIO_OIDC_PROVIDER,
                    status: "PENDING",
                    milestone: 2
                }
            ],
            rollbackWorkflow: []
        })

        // Check if error occured or not
        if(result.context.rollback) {
            console.error(result.workflow)
            const errorJob = result.workflow.find(job => job.status  == "ERROR")
            if(errorJob && errorJob.errorMessage) {
                throw new Error("ERROR: " + errorJob.errorMessage)
            } else {
                throw new Error("ERROR: An unknown error occured")
            }
        }

        // await this.app.get('kube').uninstallOauth2Proxy(id)
        // await this.app.get('kube').removeIstioOidcProviders(id)

        return { id }
    }
}
