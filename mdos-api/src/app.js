const path = require('path')
const favicon = require('serve-favicon')
const compress = require('compression')
const helmet = require('helmet')
const cors = require('cors')
const fs = require('fs')
const jwt_decode = require('jwt-decode')
const logger = require('./logger')

const feathers = require('@feathersjs/feathers')
const swagger = require('feathers-swagger')
const configuration = require('@feathersjs/configuration')
const express = require('@feathersjs/express')
const socketio = require('@feathersjs/socketio')
const { Unavailable, Forbidden } = require('@feathersjs/errors')

const middleware = require('./middleware')
const services = require('./services')
const appHooks = require('./app.hooks')
const channels = require('./channels')

const app = express(feathers())

// Load app configuration
app.configure(configuration())
// Enable security, CORS, compression, favicon and body parsing
app.use(
    helmet({
        contentSecurityPolicy: false,
    })
)
app.use(cors())
app.use(compress())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(favicon(path.join(app.get('public'), 'favicon.ico')))
// Host the public folder

app.get('/jwt', function (req, res) {
    app.get('keycloak')
        .isKeycloakDeployed()
        .then((keycloakAvailable) => {
            if (!keycloakAvailable) {
                throw new Unavailable('Keycloak is not installed')
            }

            if (!req.headers['x-auth-request-access-token']) {
                throw new Forbidden('Not athenticated')
            }

            let jwtToken = jwt_decode(req.headers['x-auth-request-access-token'])

            if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.find((r) => r == 'mdos_admin')) {
                const list = {}
                const cookieHeader = req.headers?.cookie
                if (!cookieHeader) throw new Forbidden('Not athenticated')

                cookieHeader.split(`;`).forEach(function (cookie) {
                    let [name, ...rest] = cookie.split(`=`)
                    name = name?.trim()
                    if (!name) return
                    const value = rest.join(`=`).trim()
                    if (!value) return
                    list[name] = decodeURIComponent(value)
                })

                let template = fs.readFileSync(__dirname + '/jwt.html', 'utf8')
                res.send(template.replace('{TOKEN}', list["_oauth2_proxy"]))
            } else {
                throw new Forbidden('Not authorized')
            }
        })
})

app.use('/', express.static(app.get('public')))

// Set up Plugins and providers
app.configure(express.rest())
app.configure(socketio())

app.configure(
    swagger({
        docsPath: '/docs',
        uiIndex: true,
        specs: {
            info: {
                title: 'MDos API',
                description: 'The MDos API',
                version: '1.0.0',
            },
            schemes: ['http', 'https'], // Optionally set the protocol schema used (sometimes required when host on https)
        },
    })
)

// Configure other middleware (see `middleware/index.js`)
app.configure(middleware)
// Set up our services (see `services/index.js`)
app.configure(services)
// Set up event channels (see channels.js)
app.configure(channels)

// Configure a middleware for 404s and the error handler
app.use(express.notFound())
app.use(express.errorHandler({ logger }))

app.hooks(appHooks)

module.exports = app
