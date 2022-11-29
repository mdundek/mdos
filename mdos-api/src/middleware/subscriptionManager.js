const K3SJobWorker = require('../workers/k3sJobWorker');
const KCJobWorker = require('../workers/kcJobWorker');
const FTPDJobWorker = require('../workers/ftpdJobWorker');
const { CHANNEL } = require('./brokerChannels');
const ErrorUtils = require('../libs/errorUtils');
const { nanoid } = require('nanoid');

class BrokerSubscriptions {
    /**
     * constructor
     * @param {*} app 
     */
    constructor(app) {
        this.app = app;
        this.brokerClient = app.get("brokerClient");

        this.workflowJobs = {}
    }
    
    /**
     *  HandleEvent method to consume Job event dispatcher and manage K3S namespace
     */
    async start() {
        // Initial broker connect
        if(!this.brokerClient.isConnected())
            await this.brokerClient.connect();
        
        // Subscribe now
        await this.brokerClient.waitForConnection();

        /*****************************************************
         * Events: NAMESPACE RELATED
         *****************************************************/
        await this.brokerClient.subscribe([
            CHANNEL.JOB_K3S_CREATE_NAMESPACE,
            CHANNEL.JOB_K3S_DELETE_NAMESPACE,
            CHANNEL.JOB_K3S_CREATE_REG_SECRET,
            CHANNEL.JOB_K3S_CREATE_SECRET,
            CHANNEL.JOB_K3S_REPLACE_SECRET,
            CHANNEL.JOB_K3S_DELETE_SECRET,
            CHANNEL.JOB_K3S_APPLY_USR_ROLE_BINDINGS,
            CHANNEL.JOB_K3S_INSTALL_OAUTH_PROXY,
            CHANNEL.JOB_K3S_UNINSTALL_OAUTH_PROXY,
            CHANNEL.JOB_K3S_ADD_ISTIO_OIDC_PROVIDER,
            CHANNEL.JOB_K3S_REMOVE_ISTIO_OIDC_PROVIDER,
        ], async (msg) => {
            console.log("INCOMMING 1=>", msg)
            const worker = new K3SJobWorker(this.app, msg);
            try {
                await worker.process();
                // Success, schedule next
                await worker.scheduleNext()
            } catch (error) {
                // On 503 errors, no need to keep message in queue since the preconditions are not met.
                // For other error codes, we do throw the error back at RabbitMQ so that the message gets tried again
                const errorCode = ErrorUtils.extractCode(error);
                if(errorCode == 503 || errorCode == 408) {
                    throw error;
                } else {
                    // persist error details in msg
                    worker.onJobError(error) 
                    
                    // Unrecoverable, rollback
                    if(!msg.context.rollback) {
                        await worker.scheduleWorkflowRollback()
                    }
                    else {
                        await worker.publishWorkflowDone()
                    }
                }
            }
        }, 1);
        
        /*****************************************************
         * Events: KEYCLOAK RELATED
         *****************************************************/
         await this.brokerClient.subscribe([
            CHANNEL.JOB_KC_CREATE_CLIENT,
            CHANNEL.JOB_KC_DELETE_CLIENT,
            CHANNEL.JOB_KC_CREATE_CLIENT_SA,
            CHANNEL.JOB_KC_DELETE_CLIENT_SA,
            CHANNEL.JOB_KC_CREATE_CLIENT_ROLES
        ], async (msg) => {
            console.log("INCOMMING 2=>", msg)
            const worker = new KCJobWorker(this.app, msg);
            try {
                await worker.process();
                // Success, schedule next
                await worker.scheduleNext()
            } catch (error) {
                // On 503 errors, no need to keep message in queue since the preconditions are not met.
                // For other error codes, we do throw the error back at RabbitMQ so that the message gets tried again
                const errorCode = ErrorUtils.extractCode(error);
                if(errorCode == 503 || errorCode == 408) {
                    throw error;
                } else {
                    // persist error details in msg
                    worker.onJobError(error) 
                    
                    // Unrecoverable, rollback
                    if(!msg.context.rollback) {
                        await worker.scheduleWorkflowRollback()
                    }
                    else {
                        await worker.publishWorkflowDone()
                    }
                }
            }
        }, 1);

        /*****************************************************
         * Events: FTPD RELATED
         *****************************************************/
         await this.brokerClient.subscribe([
            CHANNEL.JOB_FTPD_CREATE_CREDENTIALS,
            CHANNEL.JOB_FTPD_DELETE_CREDENTIALS
        ], async (msg) => {
            console.log("INCOMMING 3=>", msg)
            const worker = new FTPDJobWorker(this.app, msg);
            try {
                await worker.process();
                // Success, schedule next
                await worker.scheduleNext()
            } catch (error) {
                // On 503 errors, no need to keep message in queue since the preconditions are not met.
                // For other error codes, we do throw the error back at RabbitMQ so that the message gets tried again
                const errorCode = ErrorUtils.extractCode(error);
                if(errorCode == 503 || errorCode == 408) {
                    throw error;
                } else {
                    // persist error details in msg
                    worker.onJobError(error) 
                    
                    // Unrecoverable, rollback
                    if(!msg.context.rollback) {
                        await worker.scheduleWorkflowRollback()
                    }
                    else {
                        await worker.publishWorkflowDone()
                    }
                }
            }
        }, 1);

        /*****************************************************
         * Events: WORKFLOW DONE
         *****************************************************/
         await this.brokerClient.subscribe(CHANNEL.JOB_DONE, async (msg) => {
            console.log("INCOMMING 4=>", msg)
            if(this.workflowJobs[msg.context.jobId]) {
                clearTimeout(this.workflowJobs[msg.context.jobId].timeout)
                if(this.workflowJobs[msg.context.jobId].rollback)
                    this.workflowJobs[msg.context.jobId].fail(msg)
                else
                    this.workflowJobs[msg.context.jobId].success(msg)
                delete this.workflowJobs[msg.context.jobId]
            }
        }, 1);
    }

    /**
     * workflowCall
     * @param {*} topic 
     * @param {*} manifest 
     * @returns 
     */
     workflowCall(topic, manifest) {
        return new Promise((resolve, reject) => {
            if(!this.brokerClient.isConnected())
                reject(new Error("Broker not connected"))

            const jobId = nanoid()
            manifest.context.jobId = jobId
            this.workflowJobs[jobId] = {
                "success": resolve, 
                "fail": reject,
                "timeout": setTimeout(function(_jobId) {
                    this.workflowJobs[_jobId].fail(new Error("Request timeout"))
                    delete this.workflowJobs[_jobId]
                }.bind(this, jobId), 1000 * 60 * 20)
            }

            this.brokerClient.publish(topic, manifest).then(() => {}).catch((err) => {
                reject(err)
            })
        })
    }
}

module.exports = BrokerSubscriptions;