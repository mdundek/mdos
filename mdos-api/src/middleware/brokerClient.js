const io = require('socket.io-client');
const { nanoid } = require('nanoid');

class BrokerClient {

    /**
     * Constructor
     * 
     * @param {*} brokerHost 
     */
    constructor(brokerHost, manualConnect) {
        this.brokerHost = brokerHost
        this.clientUuid = nanoid()
        
        this.subscribedTopics = {}
        this.processingEventIds = []

        if(!manualConnect)
            this.connect()
    }

    /**
     * connect
     */
    connect() {
        this.socket = io(this.brokerHost)
        // When socket connection established
        this.socket.on('connect', () => {
            console.log("Connected to server")

            // Start server heartbeat interval to indicate that client is still up and running
            this.brokerHeartbeatInterval = setInterval(async () => {
                if(this.socket.connected) {
                    this.socket.emit('brokerHeartbeat', {clientUuid: this.clientUuid})
                }
            }, 5000)
        });

        // When socket connection lost
        this.socket.on("disconnect", () => {
            console.log("Connection to server lost")

            // Stop heartbeat interval
            clearInterval(this.brokerHeartbeatInterval)
        });
        
        this.socket.on("ready", async () => {
            // Re-subscribe in case we lost connection before
            await this._topicSubscribeLoop()
        })
    }

    /**
     * isConnected
     * @returns 
     */
    isConnected() {
        return this.socket ? this.socket.connected : false
    }

    /**
     * waitForConnection
     */
    async waitForConnection() {
        while(!this.isConnected()) {
            await new Promise(resolve => setTimeout(resolve, 1000)) 
        }
    }

    
    /**
     * subscribe
     * @param {*} topic 
     * @param {*} callback 
     * @param {*} concurrent 
     */
    async subscribe(topic, callback, concurrent) {
        if (topic.constructor.name == "Array") {
            for(const t of topic) {
                if(!this.subscribedTopics[t]) {
                    this.subscribedTopics[t] = { callback, concurrent, subscribed: false }
                    await this._topicSubscribeLoop()
                }
            }
        } else {
            if(!this.subscribedTopics[topic]) {
                this.subscribedTopics[topic] = { callback, concurrent, subscribed: false }
                await this._topicSubscribeLoop()
            }
        }
    }

    /**
     * publish
     * @param {*} topic 
     * @param {*} payload 
     * @returns 
     */
    publish(topic, payload) {
        return new Promise(function(_topic, _payload, resolve, reject) {
            if(!this.socket.connected) {
                reject(new Error("Not connected"))
            }
            this.socket.emit('publish', _topic, _payload, (response) => {
                if(response.status == "ok") {
                    resolve()
                } else {
                    reject(new Error("Could not publish message"))
                }
            })
        }.bind(this, topic, payload))
    }

    /**
     * incomming
     * @param {*} data 
     */
    async incomming(topic, data) {
        this.processingEventIds.push(data.id)
        try {
            await this.subscribedTopics[topic].callback(JSON.parse(data.data))
            await this.ack(data.id);
        } catch (error) {
            await this.nac(data.id);
        }
    }

    /**
     * Acknowledge event processing success
     * @param {*} eventId 
     */
    async ack(eventId) {
        while(!this.socket.connected) {
            await new Promise(r => setTimeout(r, 1000));
        }
        await this._ack(eventId)
    }

    /**
     * ACK acknowledgement call to server
     * @param {*} eventId 
     * @returns 
     */
    _ack(eventId) {
        return new Promise(function(_eventId, resolve, reject) {
            this.socket.emit('ack', {id: _eventId}, (response) => {
                if(response.status == "ok") {
                    resolve()
                } else {
                    reject()
                }
            })
            this.processingEventIds = this.processingEventIds.filter(id => id != _eventId)
        }.bind(this, eventId))
    }

    /**
     * Reject message processing
     * @param {*} eventId 
     */
     async nac(eventId) {
        while(!this.socket.connected) {
            await new Promise(r => setTimeout(r, 1000));
        }
        await this._nac(eventId)
    }

    /**
     * NAC acknowledgement call to server
     * @param {*} eventId 
     * @returns 
     */
     _nac(eventId) {
        return new Promise(function(_eventId, resolve, reject) {
            this.socket.emit('nac', {id: _eventId}, (response) => {
                if(response.status == "ok") {
                    resolve()
                } else {
                    reject()
                }
            })
            this.processingEventIds = this.processingEventIds.filter(id => id != _eventId)
        }.bind(this, eventId))
    }

    /**
     * _topicSubscribeLoop
     */
    async _topicSubscribeLoop() {
        while(true) {
            let allGood = true
            for(const topic of Object.keys(this.subscribedTopics)) {
                if(this.socket.connected) {
                    // Set up incomming topic event handler
                    if(!this.subscribedTopics[topic].subscribed) {
                        this.socket.on(topic, this.incomming.bind(this, topic))
                    }
                    // Subscribe to specific event
                    try {
                        await this._subscribe(topic, this.subscribedTopics[topic].concurrent)
                        this.subscribedTopics[topic].subscribed = true
                    } catch (error) {
                        allGood = false
                    }
                } else {
                    allGood = false
                }
            }
            if(allGood)
                break
            else
                await new Promise(r => setTimeout(r, 1000));
        }
    }

    /**
     * _subscribe
     * @param {*} topic 
     * @param {*} concurrent 
     * @returns 
     */
    _subscribe(topic, concurrent) {
        return new Promise(function(_topic, _concurrent, resolve, reject) {
            // Subscribe to specific event
            this.socket.emit('subscribe', {
                topic: _topic, 
                concurrent: _concurrent, 
                clientUuid: this.clientUuid
            }, (response) => {
                if(response.status == "ok") {
                    resolve()
                } else {
                    reject()
                }
            })
        }.bind(this, topic, concurrent))
    }
}
module.exports = BrokerClient;