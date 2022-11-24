const Kube = require('./kube.js')
const Keycloak = require('./keycloak.js')
const SocketManager = require('./socket')
const SchemaValidator = require('./schemaValidator/index')
const FtpServer = require('./ftpServer.js')
const MDosBrokerClient = require('./rb-broker/brokerClient')
const SubscriptionManager = require('./subscriptionManager')
const IstioGateways = require('./gateways')
const Certificates = require('./certificates')

// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
    // MDos full mode or framework only mode
    app.set("mdos_framework_only", process.env.API_MODE ? process.env.API_MODE.toUpperCase() != "FULL" : false)

    // Add your custom middleware here. Remember that
    // in Express, the order matters.
    app.set('kube', new Kube(app))
    app.set('socketManager', new SocketManager(app))
    app.set('schemaValidator', {
        v1: new SchemaValidator('v1', app.get("mdos_framework_only")),
    }) 
    app.set('brokerClient', new MDosBrokerClient(`${process.env.RABBIT_USERNAME}:${process.env.RABBIT_PASSWORD}@${process.env.RABBIT_HOST}:${process.env.RABBIT_PORT}`, true))

    const subscriptionManager = new SubscriptionManager(app)
    subscriptionManager.start().then(() => {})
    app.set('subscriptionManager', subscriptionManager)

    if(!app.get("mdos_framework_only")) {
        app.set('keycloak', new Keycloak(app))
        app.set('ftpServer', new FtpServer(app))
        app.set('certificates', new Certificates(app))
        app.set('gateways', new IstioGateways(app))
    }
}
