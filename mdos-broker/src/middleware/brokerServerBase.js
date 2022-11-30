class BrokerServerBase {

    /**
     * constructor
     * 
     * @param {*} app 
     */
    constructor(app) {
        this.app = app;
        this.eventLoopRunning = false
        this.connections = {}
        this.ready = false
    }

    /**
     * Resets the connection heartbeat timeout handler. This is called on
     * each heartbeat as well as on the first connect.
     * Connection heartbeats allow the server to know if a client is in trouble.
     * @param {*} socketId 
     */
    async _resetHeartbeatTimeout(socketId) {
        console.log("Incoming heartbeat")
        if(this.connections[socketId]) {
            console.log("Heartbeat check timeout clear:", socketId)
            if(this.connections[socketId].heartbeatTimeout) {
                console.log("Clearing heartbeat timeout:", socketId)
                clearTimeout(this.connections[socketId].heartbeatTimeout)
            }

            this.connections[socketId].heartbeatTimeout = setTimeout(async function(_socketId) {
                try {
                    console.log("Timeout triggered because no heartbeats for 20 sec:", _socketId)
                    await this._clearConnectionPendingEvents(_socketId)
                    await this._resetHeartbeatTimeout(_socketId)
                    await this._scheduleFireEventLoop()
                } catch (error) {
                    console.log(error)
                }
            }.bind(this, socketId), 20000)
        }
    }

    /**
     * orphantCleanup
     */
    async _orphantCleanup(forceSchedule) {
        const processingOrphants = await this._getOrphantEvents()
        if(processingOrphants.length > 0) {
            await this.app.service('events').patch(null, {
                status: "queued",
                clientUuid: null
            }, {
                query: {
                    id: {
                        $in: processingOrphants.map(o => o.id)
                    }
                }
            })
            if(!forceSchedule)
                await this._scheduleFireEventLoop()
        }
        if(forceSchedule)
            await this._scheduleFireEventLoop()
    }

    /**
     * Set all events that this connection is currently processing back to "pending" state
     * This usually happens when a socket connection is closed, or if there has not been a
     * heartbeat from the client for over 20 seconds (crash). We expect a heartbeat from each
     * client every 5 seconds.
     * 
     * @param {*} socketId 
     */
    async _clearConnectionPendingEvents(socketId) {
        if(this.connections[socketId]) {
            let pendingEventsIds = []
            for(let topic of Object.keys(this.connections[socketId].topics)) {
                pendingEventsIds = pendingEventsIds.concat(this.connections[socketId].topics[topic].processingIds)
            }
            if(pendingEventsIds.length > 0) {
                await this.app.service('events').patch(null, {
                    status: "queued",
                    clientUuid: null
                }, {
                    query: {
                        id: {
                            $in: pendingEventsIds
                        }
                    }
                })

                for(let topic of Object.keys(this.connections[socketId].topics)) {
                    this.connections[socketId].topics[topic].processingIds = []
                }
            }
        }
    }

    /**
     * Called everytime a new event has been created in the DB
     * 
     * @param {*} data 
     */
    async _onEventCreate() {
        // Only schedule event loop if there are no orphant events, otherwise
        // we will let the orphant event fixup interval deal with triggering the loop after it was fixed
        const processingOrphants = await this._getOrphantEvents()
        if(processingOrphants.length == 0) 
            await this._scheduleFireEventLoop()
    }

    /**
     * Called everytime a event has been updated in the DB.
     * If the update includes a status to "updated", we need to re-fire
     * the event loop to distribute events if possible
     * 
     * @param {*} data 
     */
    async _onEventUpdate(data) {
        if(data.status == "queued" || data.status == "success") {
            // Only schedule event loop if there are no orphant events, otherwise
            // we will let the orphant event fixup interval deal with triggering the loop after it was fixed
            const processingOrphants = await this._getOrphantEvents()
            if(processingOrphants.length == 0) 
                await this._scheduleFireEventLoop()
        }
    }

    /**
     * Schedule event distribution loop processing
     */
    async _scheduleFireEventLoop() {
        if(!this.eventLoopRunning)
            await this._fireEventLoop()
        else
            this.scheduleEventLoop = true
    }

    /**
     * This is the actual distribution loop function. This should never
     * be called directly, only through the "_scheduleFireEventLoop" function
     */
    async _fireEventLoop() {
        
        this.eventLoopRunning = true;

        // Get all queued events
        const allQueued = await this.app.service('events').find({
            query: {
              status: "queued",
              $sort: {
                createdAt: 1
              }
            }
        })
        
        for(let event of allQueued) {
            // Loop over all current open connections
            for(const socketId in this.connections) {
                // If socket connection is subscribed to topic and has available processing capacity
                if(this.connections[socketId].topics[event.topic] && this.connections[socketId].topics[event.topic].processingIds.length < this.connections[socketId].topics[event.topic].concurrent) {
                    // Create DB transaction
                    await this.app.get('sequelizeClient').transaction(async (t) => {
                        // Final check to make sure this connection is still alive
                        if(this.connections[socketId] && this.connections[socketId].topics[event.topic]) {
                            // Update event status to processing
                            await this.app.service('events').patch(event.id, { 
                                status: 'processing', 
                                clientUuid: this.connections[socketId].topics[event.topic].clientUuid 
                            }, { transaction: t });
                            
                            // Emit event to client for processing
                            this.connections[socketId].socket.emit(event.topic, {
                                id: event.id, 
                                data: event.payload
                            })  
                            // Set event ID that this socket is currently processing
                            this.connections[socketId].topics[event.topic].processingIds.push(event.id)
                        }
                    });
                    break
                }
            }
        }
        this.eventLoopRunning = false

        // Something was created or updated, re-run event loop
        if(this.scheduleEventLoop){
            this.scheduleEventLoop = false
            // Only schedule event loop if there are no orphant events, otherwise
            // we will let the orphant event fixup interval deal with triggering the loop after it was fixed
            const processingOrphants = await this._getOrphantEvents()
            if(processingOrphants.length == 0) 
                await this._fireEventLoop()
        }
    }

    /**
     * _getOrphantEvents
     * 
     * @returns 
     */
     async _getOrphantEvents() {
        const activeClientUuids = []
        for(const socketId of Object.keys(this.connections)) {
            for(const topic of Object.keys(this.connections[socketId].topics)) {
                if(!activeClientUuids.includes(this.connections[socketId].topics[topic].clientUuid))
                    activeClientUuids.push(this.connections[socketId].topics[topic].clientUuid)
            }
        }
        const processingOrphants = await this.app.service('events').find({
            query: {
                status: "processing",
                clientUuid: {
                    $nin: activeClientUuids
                }
            }
        })
        return processingOrphants
    }

    /**
     * _cleanOldEvents
     */
    async _cleanOldEvents() {
        await this.app.service('events').remove(null, {
            query: {
                status: "success",
                createdAt: {
                    $lt: new Date().getTime() - (3 * 24 * 60 * 60 * 1000)
                }
            }
        })
    }
}

module.exports = BrokerServerBase;