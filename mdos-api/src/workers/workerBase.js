const { CHANNEL } = require('../middleware/rb-broker/constant');
const ErrorUtils = require('../libs/errorUtils');

/**
 * WorkerBase
 */
class WorkerBase {

    /**
     * constructor
     */
    constructor(app, msg) {
        this.app = app;
        this.msg = msg;
       
        this.brokerClient = app.get("brokerClient");
    }

    /**
     * scheduleNext
     */
    async scheduleNext() {
        // All good, we are here so the job succeeded
        const msgClone = JSON.parse(JSON.stringify(this.msg))

        // Not rollback event
        let nextPendingJob = null;
        if(!msgClone.context.rollback) {
            for(let index = 0; index < msgClone.workflow.length; index++) {
                if(msgClone.workflow[index].topic == this.currentPendingJob.topic && msgClone.workflow[index].status == "PENDING") {
                    msgClone.workflow[index].status = "SUCCESS";
                    if(msgClone.workflow.length > index) {
                        nextPendingJob = msgClone.workflow[index+1];
                    }
                    index = msgClone.workflow.length;
                }
            }
        }
        // Rollback event
        else {
            for(let index = 0; index < msgClone.rollbackWorkflow.length; index++) {
                if(msgClone.rollbackWorkflow[index].topic == this.currentPendingJob.topic && msgClone.rollbackWorkflow[index].status == "PENDING") {
                    msgClone.rollbackWorkflow[index].status = "SUCCESS";
                    if(msgClone.rollbackWorkflow.length > index) {
                        nextPendingJob = msgClone.rollbackWorkflow[index+1];
                    }
                    index = msgClone.rollbackWorkflow.length;
                }
            }
        }

        // There are more jobs to come, trigger next one
        if(nextPendingJob) {
            await this.app.get("brokerClient").publish(nextPendingJob.topic, msgClone)
        }
        // This was the last job, we are done
        else {
            await this.publishWorkflowDone(msgClone);
        }
    }

    /**
     * scheduleWorkflowRollback
     */
    async scheduleWorkflowRollback() {
        // All good, we are here so the job succeeded
        const msgClone = JSON.parse(JSON.stringify(this.msg))
        msgClone.context.rollback = true

        const currentRollbackJob = msgClone.rollbackWorkflow.length > 0 ? msgClone.rollbackWorkflow[0] : null;
        if(currentRollbackJob) { // There is at least one rollback job
            await this.app.get("brokerClient").publish(currentRollbackJob.topic, msgClone)
        } else { // No rollback jobs, we are done
            await this.publishWorkflowDone(msgClone)
        }
    }

    /**
     * publishWorkflowDone
     * @param {*} msg 
     */
    async publishWorkflowDone(msg) {
        await this.app.get("brokerClient").publish(CHANNEL.JOB_DONE, msg ? msg : this.msg)
    }

    /**
     * onJobError
     * @param {*} error 
     */
    onJobError(error) {
        // Update job with error details first
        if(!this.msg.context.rollback) {
            for(let index = 0; index < this.msg.workflow.length; index++) {
                if(this.msg.workflow[index].topic == this.currentPendingJob.topic && this.msg.workflow[index].status == "PENDING") {
                    this.msg.workflow[index].status = "ERROR";
                    this.msg.workflow[index].errorCode = ErrorUtils.extractCode(error)
                    this.msg.workflow[index].errorMessage = ErrorUtils.extractMessage(error)
                    this.msg.workflow[index].errorStack = error.stack
                    index = this.msg.rollbackWorkflow.length;
                }
            }
        } else {
            for(let index = 0; index < this.msg.rollbackWorkflow.length; index++) {
                if(this.msg.rollbackWorkflow[index].topic == this.currentPendingJob.topic && this.msg.rollbackWorkflow[index].status == "PENDING") {
                    this.msg.rollbackWorkflow[index].status = "ERROR";
                    index = this.msg.rollbackWorkflow.length;
                }
            }
        }
    }
};

module.exports = WorkerBase;