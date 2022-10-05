const WorkerBase = require('./workerBase')

/**
 * NamespaceCreateJobWorker
 */
 class NamespaceCreateJobWorker extends WorkerBase {

    /**
     * constructor
     */
    constructor(app, msg) {
       super(app, msg)
    }

    /**
     * startDispatch
     */
    async startDispatch() {
        console.log("INCOMMING", this.msg);
    }
};

module.exports = NamespaceCreateJobWorker;