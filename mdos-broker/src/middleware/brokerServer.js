const BrokerServerBase = require('./brokerServerBase')

class BrokerServer extends BrokerServerBase {

    /**
     * constructor
     * 
     * @param {*} app 
     */
    constructor(app) {
        super(app)
    }

    /**
     * init: Subscribe to event table create / update events
     */
    init() {
        // Periodically clean up DB & check to see if there are orphant events in DB that are processing

        // NOTE: If server goes down and comes back up, it will take a few seconds before all clients
        // subscribed to all topics again. Need to make sure we don't requeue events that are processing
        // on client side before they have time to re-subscribe

        // One time after 20 seconds on startup
        setTimeout(async() => {
            // Make sure we start the event monitor loop even if no orphants found the first time
            await this._orphantCleanup(true) 
            // On interval every 5 seconds
            setInterval(async () => {
                await this._orphantCleanup()
            }, 5000) // 5 seconds

            // Keep database tidy, run once every 24 hours
            setInterval(async () => {
                await this._cleanOldEvents()
            }, (24 * 60 * 60 * 1000))
            // And run once now on startup
            await this._cleanOldEvents()
        }, 20000) // once after 20 seconds
        
        this.app.service('events').on('created', this._onEventCreate.bind(this));
        this.app.service('events').on('updated', this._onEventUpdate.bind(this));
        this.app.service('events').on('patched', this._onEventUpdate.bind(this));
    }

    /**
     * On connect / reconnect
     * 
     * @param {*} socket 
     */
    async onConnect(socket) {
        this.connections[socket.id] = {
            socket,
            topics: {}
        }

        // Create heartbeat timeout listener, in case the client does not
        // send a heartbeat signal for over 20 seconds (ex. if crashed)
        await this._resetHeartbeatTimeout(socket.id);

        // Only schedule event loop if there are no orphant events, otherwise
        // we will let the orphant event fixup interval deal with triggering the loop after it was fixed
        const processingOrphants = await this._getOrphantEvents()
        if(processingOrphants.length == 0) 
            await this._scheduleFireEventLoop()  
        return socket.id       
    }

    /**
     * Connection lost
     * 
     * @param {*} socketId 
     */
    async onDisconnect(socketId) {
        if(this.connections[socketId]) {
            // If this socket is flagged as being bussy, we need to assume that the
            // event job is not fully processed, therefore we requeue it
            await this._clearConnectionPendingEvents(socketId)

            // Only schedule event loop if there are no orphant events, otherwise
            // we will let the orphant event fixup interval deal with triggering the loop after it was fixed
            const processingOrphants = await this._getOrphantEvents()
            if(processingOrphants.length == 0) 
                await this._scheduleFireEventLoop()
        }
        delete this.connections[socketId]
    }

    /**
     * Client Heartbeat
     * 
     * @param {*} socketId 
     */
    async heartbeat(socketId) {
        await this._resetHeartbeatTimeout(socketId)
    }

    /**
     * Acknowledge event processing success
     * 
     * @param {*} data 
     */
    async ack(socketId, data) {
        for(const topic of Object.keys(this.connections[socketId].topics)) {
            if(this.connections[socketId].topics[topic].processingIds.includes(data.id)) {
                this.connections[socketId].topics[topic].processingIds = this.connections[socketId].topics[topic].processingIds.filter(id => id != data.id)
            }
        }
        await this.app.service('events').patch(data.id, {
            status: "success"
        })
    }

    /**
     * Reject message processing
     * 
     * @param {*} data 
     */
    async nac(socketId, data) {
        for(const topic of Object.keys(this.connections[socketId].topics)) {
            if(this.connections[socketId].topics[topic].processingIds.includes(data.id)) {
                this.connections[socketId].topics[topic].processingIds = this.connections[socketId].topics[topic].processingIds.filter(id => id != data.id)
            }
        }
        await this.app.service('events').patch(data.id, {
            status: "queued",
            clientUuid: null
        })
    }

    /**
     * Subscribe to a topic
     * 
     * @param {*} socketId 
     * @param {*} data 
     */
    async subscribe(socketId, data) {
        if(!this.connections[socketId]) {
            throw new Error("No connection")
        }

        if(!this.connections[socketId].topics[data.topic]) {
            this.connections[socketId].topics[data.topic] = {
                concurrent: data.concurrent,
                clientUuid: data.clientUuid,
                processingIds: []
            }

            // Reload currently processing client events from DB if any
            // This is necessary so that if the broker crashes and reboots,
            // that we can rematch currently processing clients with a specific clientUuid.
            // Get all queued events
            const allClientUuidSpecificEvents = await this.app.service('events').find({
                query: {
                    status: "processing",
                    clientUuid: data.clientUuid
                }
            })
            for(const clientProcessingEvent of allClientUuidSpecificEvents) {
                this.connections[socketId].topics[data.topic].processingIds.push(clientProcessingEvent.id)
            }

            // Only schedule event loop if there are no orphant events, otherwise
            // we will let the orphant event fixup interval deal with triggering the loop after it was fixed
            const processingOrphants = await this._getOrphantEvents()
            if(processingOrphants.length == 0) 
                await this._scheduleFireEventLoop()
        }
    }
}

module.exports = BrokerServer;