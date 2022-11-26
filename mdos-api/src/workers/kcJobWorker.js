const WorkerBase = require('./workerBase')
const { CHANNEL } = require('../middleware/brokerChannels');
const KCCore = require('../services/keycloak/keycloak.class.core')
const KubeCore = require('../services/kube/kube.class.core')

/**
 * KCJobWorker
 */
 class KCJobWorker extends WorkerBase {

    /**
     * constructor
     */
    constructor(app, msg) {
       super(app, msg)

       this.currentPendingJob = null;
    }

    /**
     * process
     */
    async process() {
        // Not rollback event
        if(!this.msg.context.rollback) {
            this.currentPendingJob = this.msg.workflow.find(job => job.status == "PENDING")
        }
        // Rollback event
        else {
            this.currentPendingJob = this.msg.rollbackWorkflow.find(job => job.status == "PENDING")
        }

        // Process job
        switch(this.currentPendingJob.topic) {
            case CHANNEL.JOB_KC_CREATE_CLIENT:
                await this.createClient();
                break;
            case CHANNEL.JOB_KC_DELETE_CLIENT:
                await this.deleteClient();
                break;
            case CHANNEL.JOB_KC_CREATE_CLIENT_SA:
                await this.createClientSa();
                break;
            case CHANNEL.JOB_KC_DELETE_CLIENT_SA:
                await this.deleteClientSa();
                break;
            case CHANNEL.JOB_KC_CREATE_CLIENT_ROLES:
                await this.createClientRoles();
                break;
            default:
                throw new Error("Missplaced topic for this job worker");
        }
    }

    /**
     * createClient
     */
    async createClient() {
        await this.app.get('keycloak').createClient(this.msg.context.realm, this.msg.context.namespace)
    }

    /**
     * deleteClient
     */
     async deleteClient() {
        const kcClient = await this.app.get('keycloak').getClient(this.msg.context.realm, this.msg.context.namespace)
        if(kcClient)
            await this.app.get('keycloak').deleteClient(this.msg.context.realm, kcClient.id)
    }

    /**
     * createClientSa
     */
    async createClientSa() {
        const kcClient = await this.app.get('keycloak').getClient(this.msg.context.realm, this.msg.context.namespace)
        if(kcClient)
            await new KubeCore(this.app).createKeycloakSaForNamespace(this.msg.context.realm, kcClient.clientId, kcClient.id, this.msg.context.kcSaUser, this.msg.context.kcSaPass)
        else
            throw new Error(`Keycloak client "${this.msg.context.namespace}" not found`)
    }

    /**
     * deleteClientSa
     */
     async deleteClientSa() {
        await new KCCore(this.app).deleteKeycloakSAUser(this.msg.context.realm, this.msg.context.namespace)
    }

    /**
     * createClientRoles
     */
     async createClientRoles() {
        const kcClient = await this.app.get('keycloak').getClient(this.msg.context.realm, this.msg.context.namespace)
        if(kcClient)
            await new KCCore(this.app).createKeycloakClientRoles(this.msg.context.realm, kcClient.id)
        else
            throw new Error(`Keycloak client "${this.msg.context.namespace}" not found`)
    }
};

module.exports = KCJobWorker;