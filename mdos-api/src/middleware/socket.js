const feathers = require('@feathersjs/feathers')
const socketio = require('@feathersjs/socketio')
const nanoid_1 = require("nanoid");
const nanoid = (0, nanoid_1.customAlphabet)('1234567890abcdefghijklmnopqrstuvwxyz', 10);

class SocketManager {

    /**
     * constructor
     * @param {*} app
     */
    constructor(app) {
        this.app = app;
        this.sessions = {}

        this.app.configure(
            socketio((io) => {
                io.on('connection', this._onConnection.bind(this))
            })
        )
    }

    /**
     * _onConnection
     * @param {*} socket 
     */
    _onConnection(socket) {
        const processId = nanoid();

        this.sessions[processId] = {
            socket: socket,
            timeout: setTimeout(function(_processId) {
                this._sessionHeartbeatTimeout(_processId);
            }.bind(this, processId), 10 * 1000)
        }

        socket.on('heartbeat', (data) => {
            if(this.sessions[data]) {
                clearTimeout(this.sessions[data].timeout);
                this.sessions[data].timeout = setTimeout(function(_processId) {
                    this._sessionHeartbeatTimeout(_processId);
                }.bind(this, data), 10 * 1000)
            }
        });

        socket.on('disconnect', function(_processId) {
            delete this.sessions[_processId];
        }.bind(this, processId));

        socket.emit("processId", processId);
    }

    /**
     * _sessionHeartbeatTimeout
     */
    _sessionHeartbeatTimeout(processId) {
        if(this.sessions[processId]) {
            console.log("disconnect timeout");
            this.sessions[processId].socket.disconnect(true)
        }
    }

    /**
     * emit
     * @param {*} processId 
     * @param {*} data 
     */
    emit(processId, data) {
        if(this.sessions[processId]) {
            this.sessions[processId].socket.emit("event", data);
        }
    }
}

module.exports = SocketManager
