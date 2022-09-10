const Kube = require('./kube.js')
const Keycloak = require('./keycloak.js')
// const S3 = require('./s3.js')
const SocketManager = require('./socket')
const SchemaValidator = require('./schemaValidator/index')
const FtpServer = require('./ftpServer.js')

// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
    // Add your custom middleware here. Remember that
    // in Express, the order matters.
    app.set('kube', new Kube(app))
    app.set('keycloak', new Keycloak(app))
    // app.set('s3', new S3(app))
    app.set('socketManager', new SocketManager(app))
    app.set('schemaValidator', {
        v1: new SchemaValidator('v1'),
    })
    const ftpServer = new FtpServer(app);
    ftpServer.start();
    app.set('ftpServer', ftpServer)
}
