const amqp = require('amqplib');
const { nanoid } = require('nanoid');

class BrokerBase {

    /**
    * connect
    */
    async connect() {
        this.connected = false;

        // Connect
        while(true) {
            console.log(`MDOS-Broker-Client: attempt to connect...`);
            try{
                this.connectionHangWatcher = setTimeout(() => {
                    console.log('MDOS-Broker-Client: broker client connect is hanging, exiting application to reschedule the POD');
                    process.exit(1);
                }, 15000); // 15 seconds
                this.connection = await amqp.connect(this.brokerUrl);
                clearTimeout(this.connectionHangWatcher);
                this.connectionHangWatcher = null;
                console.log('MDOS-Broker-Client: connection established');
                break;
            } catch(errorCon) {
                clearTimeout(this.connectionHangWatcher);
                this.connectionHangWatcher = null;
                console.error("MDOS-Broker-Client: connection error");
                console.error('MDOS-Broker-Client: wait 5 seconds to try and reconnect...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        // On error & close events
        this.connection.on('error', (e) => {
            console.error('MDOS-Broker-Client: connection closed with error');
            this._afterConnectionClosed();
        });

        this.connection.on('close', (e) => {
            console.error('MDOS-Broker-Client: connection closed');
            this._afterConnectionClosed();
        });

        // Init channels
        try {
            await this._createChannels();
        } catch (error) {
            this.connected = false;
            console.error("MDOS-Broker-Client: channel creation error");
            await this._closeChannels();
            try { await this.connection.close(); } catch (error) {}
            return this._attemptReconnect();
        }
        
        // Re-bind consumers
        for(const consumetTag in this.consumerInstances) {
            await this._consume(consumetTag, this.consumerInstances[consumetTag].cb, this.consumerInstances[consumetTag].prefetch);
        }

        // Properly connected now
        this.connected = true;
    }

    /**
     * _createChannels
     */
    async _createChannels() {
        for(let channel in this.channel) {
            this.channel[channel] = await this.connection.createConfirmChannel();
            await this.channel[channel].assertQueue(channel, { exclusive: false, durable: true });
            
            // When the this.channel[channel] is closed by the server, attempt to reconnect
            // Do not respond to a closed connection - the reconnect is handled by the closed channel
            this.channel[channel].on('close', () => {
                this._afterConnectionClosed();
            });
        }
    }

    /**
     * _afterConnectionClosed
     */
    _afterConnectionClosed() {
        if(this.connected) {
            this.connected = false;
        }

        if(this.eventTemporizer) {
            clearTimeout(this.eventTemporizer);
        }

        this.eventTemporizer = setTimeout(() => {
            this.eventTemporizer = null;
            this._closeChannels().then(() => {
                if(this.connection) {
                    this.connection.close().then(() => {
                        this._attemptReconnect();
                    }).catch(err => {
                        this._attemptReconnect();
                    });
                } else {
                    this._attemptReconnect();
                }
            });
        }, 3000); // 3 seconds  
    }

    /**
     * _closeChannels
     */
    async _closeChannels() {
        for(let channel in this.channel) {
            if(this.channel[channel])
                try { await this.channel[channel].close(); } catch (error) {}
            delete this.channel[channel];
        }
    }

    /**
     * _produce
     */
     _produce(queue, message) {
        return new Promise((resolve, reject) => {
            if(this.connected) {
                const uid = nanoid();
                const ackTracker = {
                    uid: uid,
                    timeout: setTimeout(function(_uid, _reject) { // Timeout watchdog
                        // Remove ack_job from stack
                        this.publishAckTimeouts = this.publishAckTimeouts.filter(o => o.uid != _uid);

                        // Reject publish attempt
                        const err = new Error("MDOS-Broker-Client: could not publish broker event, ack watchdog timeout");
                        err.code = 503;
                        _reject(err);
                    }.bind(this, uid, reject), 5000)
                }
                this.publishAckTimeouts.push(ackTracker);
                
                try {
                    const keepSending = this.channel[queue].sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true, mandatory: true }, function(_uid, err) {
                        let pending = this.publishAckTimeouts.find(o => o.uid == _uid);
                        // Caller still expecting response
                        if(pending) {
                            // Remove ack_job from stack
                            this.publishAckTimeouts = this.publishAckTimeouts.filter(o => o.uid != _uid);

                            // Stop watchdock timeout
                            try { clearTimeout(pending.timeout); } catch (_e) { }

                            // Eval error for promise resolution
                            if(err) {
                                err.code = 503;
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    }.bind(this, uid));

                    // queue is full
                    if(!keepSending) {
                        let pending = this.publishAckTimeouts.find(o => o.uid == uid);
                        // Caller still expecting response
                        if(pending) {                           
                            // Remove ack_job from stack
                            this.publishAckTimeouts = this.publishAckTimeouts.filter(o => o.uid != uid);

                            // Stop watchdock timeout
                            try { clearTimeout(pending.timeout); } catch (_e) { }
    
                            // Reject publish attempt
                            const err = new Error("MDOS-Broker-Client: could not publish broker event");
                            err.code = 503;
                            reject(err);
                        }
                    }
                } catch (e) {
                    let pending = this.publishAckTimeouts.find(o => o.uid == uid);
                    // Caller still expecting response
                    if(pending) {                        
                        // Remove ack_job from stack
                        this.publishAckTimeouts = this.publishAckTimeouts.filter(o => o.uid != uid);

                        // Stop watchdock timeout
                        try { clearTimeout(pending.timeout); } catch (_e) { }
                        
                        // Reject publish attempt
                        const err = new Error("MDOS-Broker-Client: could not publish broker event");
                        err.code = 503;
                        reject(err);
                    }
                }
            }
            else {
                // Reject publish attempt
                const err = new Error("MDOS-Broker-Client: broker not connected");
                err.code = 503;
                reject(err);
            }
        });
    }

    /**
     * _consume
     */
     async _consume(queue, cb, prefetch) {
        if(prefetch) await this.channel[queue].prefetch(prefetch);

        this.channel[queue].consume(queue, function(_queue, _cb, msg) {
            _cb(JSON.parse(msg.content.toString())).then(
                function(_msg, __queue) {
                    this._ackMessage(true, __queue, _msg).then(() => {}).catch(() => {});
                }.bind(this, msg, _queue)
            )
            .catch(
                function(_msg, __queue, err) {
                    setTimeout(function(__msg, ___queue) {
                        this._ackMessage(false, ___queue, __msg).then(() => {}).catch(() => {});
                    }.bind(this, _msg, __queue), 2 * 1000);
                }.bind(this, msg, _queue)
            );
        }.bind(this, queue, cb));
    }

    /**
     * _ackMessage
     * @param {*} success 
     * @param {*} queue 
     * @param {*} msg 
     */
    async _ackMessage(success, queue, msg) {
        while(true){
            if(this.connected) {
                if(success) {
                    this.channel[queue].ack(msg);
                }
                else {
                    this.channel[queue].nack(msg);
                }
                break;
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    /**
     * _attemptReconnect
     */
    _attemptReconnect() {
        this.connection = null;
        console.error('MDOS-Broker-Client: wait 5 seconds to try and reconnect...');
        setTimeout(() => {
            this.connect().then(() => {}).catch(() => {});
        }, 5 * 1000);
    }
}

module.exports = BrokerBase;