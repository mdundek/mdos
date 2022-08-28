const feathers = require('@feathersjs/feathers');
const socketio = require('@feathersjs/socketio-client');
const io = require('socket.io-client');

class SocketManager {

    /**
     * constructor
     * @param {*} app
     */
    constructor(serverUrl, kcCookie) {
        if(kcCookie) {
            this.socket = io(serverUrl, {
                extraHeaders: {
                    Cookie: `_oauth2_proxy=${kcCookie};`
                }
            });
        } else {
            this.socket = io(serverUrl);
        }
        
        this.app = feathers();

        // Set up Socket.io client with the socket
        this.app.configure(socketio(this.socket));
    }

    /**
     * subscribe
     * @param {*} processId 
     * @param {*} cb 
     */
    subscribe(cb) {
        return new Promise(function(_cb, resolve, reject) {
            // Wait for processId to use to track job
            this.socket.once("processId", function(processId) {
                // Let the server know that the client is still alive to keep the job running untill done
                this.heartbeatInterval = setInterval(function(_processId) {
                    this.socket.emit("heartbeat", _processId)
                }.bind(this, processId), 3000)
                // Return processId to caller
                resolve(processId)
            }.bind(this))
            // Listen to incomming events
            this.socket.on("event", function(__cb, data) {
                __cb(data);
            }.bind(this, _cb))
        }.bind(this, cb))
    }

    /**
     * unsubscribe
     */
    unsubscribe() {
        clearInterval(this.heartbeatInterval)
        this.socket.removeAllListeners(["event"])
        this.socket.disconnect(true)
    }
}

module.exports = SocketManager
