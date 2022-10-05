const NamespaceCreateJobWorker = require('./namespaceCreateJobWorker');
const { CHANNEL } = require('../middleware/rb-broker/constant');
const ErrorUtils = require('../libs/errorUtils');

class BrokerSubscriptions {
    /**
     * constructor
     * @param {*} app 
     */
    constructor(app) {
        this.app = app;
        this.brokerClient = app.get("brokerClient");
    }
    
    /**
     *  HandleEvent method to consume Job event dispatcher and manage K3S namespace
     */
    async start() {
        // Initial broker connect
        if(!this.brokerClient.connected)
            await this.brokerClient.connect();
        
        // Subscribe now
        await this.brokerClient.waitForConnection();

        /*****************************************************
         * Events: NAMESPACE CREATION
         *****************************************************/
        await this.brokerClient.subscribe(CHANNEL.JOB_CREATE_NAMESPACE, async (msg) => {
            try {
                await new NamespaceCreateJobWorker(this.app, msg).startDispatch();
            } catch (error) {
                // On 503 errors, no need to keep message in queue since the preconditions are not met.
                // For other error codes, we do throw the error back at RabbitMQ so that the message gets tried again
                const errorCode = ErrorUtils.extractCode(error);
                if(errorCode == 503 || errorCode == 408) {
                    throw error;
                } else {
                    console.log("Unrecoverable error =>", error)
                }
            }
        }, 1);
    }
}

module.exports = BrokerSubscriptions;