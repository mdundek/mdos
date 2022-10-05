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
};

module.exports = WorkerBase;