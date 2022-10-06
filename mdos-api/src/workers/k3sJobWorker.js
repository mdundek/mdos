const WorkerBase = require('./workerBase')
const { CHANNEL } = require('../middleware/rb-broker/constant');
const KubeCore = require('../services/kube/kube.class.core')

/**
 * K3SJobWorker
 */
 class K3SJobWorker extends WorkerBase {

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
            case CHANNEL.JOB_K3S_CREATE_NAMESPACE:
                await this.createNamespace();
                break;
            case CHANNEL.JOB_K3S_DELETE_NAMESPACE:
                await this.deleteNamespace();
                break;
            case CHANNEL.JOB_K3S_CREATE_REG_SECRET:
                await this.createRegistrySecret();
                break;
            case CHANNEL.JOB_K3S_CREATE_SECRET:
                await this.createSecret();
                break;
            case CHANNEL.JOB_K3S_DELETE_SECRET:
                await this.deleteSecret();
                break;
            case CHANNEL.JOB_K3S_REPLACE_SECRET:
                await this.replaceSecret();
                break;
            case CHANNEL.JOB_K3S_APPLY_USR_ROLE_BINDINGS:
                await this.applyUserRoleBindings();
                break;
            default:
                throw new Error("Missplaced topic for this job worker");
        }
    }

    /**
     * createNamespace
     */
    async createNamespace() {
        await new KubeCore(this.app).createNamespace(this.msg.context.namespace)
    }

    /**
     * deleteNamespace
     */
     async deleteNamespace() {
        const hasNs = await this.app.get('kube').hasNamespace(this.msg.context.namespace)
        if(hasNs)
            await this.app.get('kube').deleteNamespace(this.msg.context.namespace)
    }

    /**
     * createRegistrySecret
     */
    async createRegistrySecret() {
        await this.app.get('kube').createRegistrySecret(this.msg.context.namespace, 'mdos-regcred', this.msg.context.registryUser, this.msg.context.registryPass)
    }

    /**
     * createSecret
     */
     async createSecret() {
        console.log("=> createSecret");
    }

    /**
     * deleteSecret
     */
     async deleteSecret() {
        console.log("=> deleteSecret");
    }

    /**
     * replaceSecret
     */
     async replaceSecret() {
        console.log("=> replaceSecret");
    }

    /**
     * applyUserRoleBindings
     */
     async applyUserRoleBindings() {
        await this.app.get('kube').applyUserRoleBindingsForNamespaces()
    }
};

module.exports = K3SJobWorker;