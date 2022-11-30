const { Unavailable } = require('@feathersjs/errors')
const OidcProviderCore = require('./oidc-provider.class.core')
const { CHANNEL } = require('../../middleware/brokerChannels')

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
     * Find
     *
     * @param {*} params
     * @param {*} context
     * @return {*}
     */
    async find(params, context) {
        const oidcProviders = await this.app.get('kube').getOidcProviders()
        return oidcProviders
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
                    oidcTarget: 'keycloak',
                    realm: body.realm,
                    providerName: body.data.name,
                    kcClientId: body.data.clientId,
                    rollback: false,
                },
                workflow: [
                    {
                        topic: CHANNEL.JOB_K3S_INSTALL_OAUTH_PROXY,
                        status: 'PENDING',
                        milestone: 1,
                    },
                    {
                        topic: CHANNEL.JOB_K3S_ADD_ISTIO_OIDC_PROVIDER,
                        status: 'PENDING',
                        milestone: 2,
                    },
                ],
                rollbackWorkflow: [
                    {
                        topic: CHANNEL.JOB_K3S_UNINSTALL_OAUTH_PROXY,
                        status: 'PENDING',
                        milestone: 1,
                    },
                ],
            })

            // Check if error occured or not
            if (result.context.rollback) {
                console.error(result.workflow)
                const errorJob = result.workflow.find((job) => job.status == 'ERROR')
                if (errorJob && errorJob.errorMessage) {
                    throw new Error('ERROR: ' + errorJob.errorMessage)
                } else {
                    throw new Error('ERROR: An unknown error occured')
                }
            }
        } else if (body.type == 'google') {
            // Make sure OIDC provider does not already exist
            await this.ensureProviderNotDeclared(body.data.name)

            // Kick off event driven workflow
            const result = await this.app.get('subscriptionManager').workflowCall(CHANNEL.JOB_K3S_INSTALL_OAUTH_PROXY, {
                context: {
                    oidcTarget: 'google',
                    providerName: body.data.name,
                    googleClientId: body.data.googleClientId,
                    googleClientSecret: body.data.googleClientSecret,
                    redirectUris: body.data.redirectUris,
                    rollback: false,
                },
                workflow: [
                    {
                        topic: CHANNEL.JOB_K3S_INSTALL_OAUTH_PROXY,
                        status: 'PENDING',
                        milestone: 1,
                    },
                    {
                        topic: CHANNEL.JOB_K3S_ADD_ISTIO_OIDC_PROVIDER,
                        status: 'PENDING',
                        milestone: 2,
                    },
                ],
                rollbackWorkflow: [
                    {
                        topic: CHANNEL.JOB_K3S_UNINSTALL_OAUTH_PROXY,
                        status: 'PENDING',
                        milestone: 1,
                    },
                ],
            })

            // Check if error occured or not
            if (result.context.rollback) {
                console.error(result.workflow)
                const errorJob = result.workflow.find((job) => job.status == 'ERROR')
                if (errorJob && errorJob.errorMessage) {
                    throw new Error('ERROR: ' + errorJob.errorMessage)
                } else {
                    throw new Error('ERROR: An unknown error occured')
                }
            }
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
                providerName: id,
                rollback: false,
            },
            workflow: [
                {
                    topic: CHANNEL.JOB_K3S_UNINSTALL_OAUTH_PROXY,
                    status: 'PENDING',
                    milestone: 1,
                },
                {
                    topic: CHANNEL.JOB_K3S_REMOVE_ISTIO_OIDC_PROVIDER,
                    status: 'PENDING',
                    milestone: 2,
                },
            ],
            rollbackWorkflow: [],
        })

        // Check if error occured or not
        if (result.context.rollback) {
            console.error(result.workflow)
            const errorJob = result.workflow.find((job) => job.status == 'ERROR')
            if (errorJob && errorJob.errorMessage) {
                throw new Error('ERROR: ' + errorJob.errorMessage)
            } else {
                throw new Error('ERROR: An unknown error occured')
            }
        }

        return { id }
    }
}
