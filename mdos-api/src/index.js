require('dotenv').config()

/* eslint-disable no-console */
const logger = require('./logger')
const app = require('./app')
const port = app.get('port')
const server = app.listen(port)
var path = require('path')

// Set a timeout of 10 minutes for requests
server.setTimeout(1000 * 60 * 10)

global.APP_ROOT = path.resolve(__dirname)

process.on('unhandledRejection', (reason, p) => logger.error('Unhandled Rejection at: Promise ', p, reason))

server.on('listening', () => logger.info('Feathers application started on http://%s:%d', app.get('host'), port))
