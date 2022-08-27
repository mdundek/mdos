const feathers = require('@feathersjs/feathers');
const socketio = require('@feathersjs/socketio-client');
const io = require('socket.io-client');

class SocketManager {

    /**
     * constructor
     * @param {*} app
     */
    constructor(serverUrl) {
        this.socket = io(serverUrl);
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
            // Wait for processId
            this.socket.on("processId", function(processId) {
                this.heartbeatInterval = setInterval(function(_processId) {
                    this.socket.emit("heartbeat", _processId)
                }.bind(this, processId), 3000)
                resolve(processId)
            }.bind(this))
            // Listen to incomming events
            this.socket.on("event", function(__cb, data) {
                __cb(data);
            }.bind(this, _cb))
        }.bind(this, cb))
    }
}

module.exports = SocketManager
