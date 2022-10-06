const WorkerBase = require('./workerBase')
const { CHANNEL } = require('../middleware/rb-broker/constant');

/**
 * FTPDJobWorker
 */
 class FTPDJobWorker extends WorkerBase {

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
            case CHANNEL.JOB_FTPD_CREATE_CREDENTIALS:
                await this.createCredentials();
                break;
            case CHANNEL.JOB_FTPD_DELETE_CREDENTIALS:
                await this.deleteCredentials();
                break;
            default:
                throw new Error("Missplaced topic for this job worker");
        }
    }

    /**
     * createCredentials
     */
    async createCredentials() {
        const nsName = this.msg.context.namespace
        const secretName = `ftpd-${nsName}-creds`
        const credentials = await this.app.get("ftpServer").createFtpdCredentials(nsName)
        const secretExists = await this.app.get('kube').hasSecret("mdos", secretName)
        if(secretExists)
            await this.app.get('kube').replaceSecret("mdos", secretName, credentials)
        else
            await this.app.get('kube').createSecret("mdos", secretName, credentials)
    }

    /**
     * deleteCredentials
     */
     async deleteCredentials() {
        console.log("=> deleteCredentials");
    }
};

module.exports = FTPDJobWorker;