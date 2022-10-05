const exitHook = require('async-exit-hook');
const BrokerBase = require('./brokerBase.js');
const { CHANNEL } = require('./constant');

/**
 * MDosBrokerClient
 */
class MDosBrokerClient extends BrokerBase {

    /**
     * constructor
     * @param {*} brokerUrl the broker IP or Domain name 
     */
    constructor(brokerUrl, manualConnect) {
        super();
        // this.broker = new brokerClient(brokerUrl);  
        this.brokerUrl = `amqp://${brokerUrl}`;
        this.connected = false;
        this.connection = null;
        
        this.publishAckTimeouts = [];
        
        this.channel = {};

        for(let topic in CHANNEL) {
            this.channel[CHANNEL[topic]] = null
        }
       
        this.consumerInstances = {};
        exitHook(async () => {
            if(this.connected) {
                console.log("Closing EMQP connection...");
                await this._closeChannels();
                try { await this.connection.close(); } catch (error) {}
            }
        });
        if(!manualConnect)
            this.connect().then(() => {}).catch((err) => {});
    }

    /**
    * waitForConnection
    */
    async waitForConnection() {
        while(!this.connected) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    /**
     * publish
     * @param {*} topic 
     * @param {*} message 
     */
    async publish(topic, message){
        if(this.connected) {
            await this._produce(topic, message);
        } else {
            throw new Error("Broker disconected");
        }         
    }

    /**
     * subscribe
     * @param {*} topic 
     * @param {*} cb 
     * @param {*} prefetch 
     */
    async subscribe(topic, cb, prefetch){
        if(this.connected && this.channel[topic]) {
            await this._consume(topic, cb, prefetch);
            this.consumerInstances[topic] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
     * unsubscribe
     * @param {*} topic 
     */
    async unsubscribe(topic){
        if(this.connected && this.channel[topic]) {
           await this.channel[topic].cancel(topic);
        }
        delete this.consumerInstances[topic];
    }
}

module.exports = MDosBrokerClient;
