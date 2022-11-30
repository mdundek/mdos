const path = require('path');
const favicon = require('serve-favicon');
const compress = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./logger');

const feathers = require('@feathersjs/feathers');
const configuration = require('@feathersjs/configuration');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');

const middleware = require('./middleware');
const services = require('./services');
const appHooks = require('./app.hooks');
const channels = require('./channels');

const sequelize = require('./sequelize');

const app = express(feathers());

// Load app configuration
app.configure(configuration());
// Enable security, CORS, compression, favicon and body parsing
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(compress());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(favicon(path.join(app.get('public'), 'favicon.ico')));
// Host the public folder
app.use('/', express.static(app.get('public')));

// Set up Plugins and providers
app.configure(express.rest());

app.configure(
  socketio({
      serveClient: false
  }, function (io) {
      app.get("brokerServer").init()

      io.on("connection", (socket) => {
          // On client connect
          app.get("brokerServer").onConnect(socket).then((socketId) => {
              app.get("brokerServer").connections[socketId].socket.emit("ready", "") 
          })

          // On client disconnect
          socket.on("disconnect", async function (socketId) {
              await app.get("brokerServer").onDisconnect(socketId)
          }.bind(this, socket.id));

          // On client socket heartbeat
          socket.on("brokerHeartbeat", async function (socketId) {
              await app.get("brokerServer").heartbeat(socketId)
          }.bind(this, socket.id));

          // On topic event subscription
          socket.on("subscribe", async function (socketId, topic, cb) {
              try {
                  await app.get("brokerServer").subscribe(socketId, topic)
                  cb({
                      status: "ok"
                  })
              } catch (error) {
                  cb({
                      status: "ko"
                  })
              }
          }.bind(this, socket.id));

          // On topic event subscription
          socket.on("publish", async function (topic, data, cb) {
              try {
                  await app.service('events').create({"topic":topic,"payload": JSON.stringify(data)})
                  cb({
                      status: "ok"
                  })
              } catch (error) {
                  cb({
                      status: "ko"
                  })
              }
          });

          // On event acknowledge (success processing, discard event)
          socket.on("ack", async function (socketId, data, cb) {
              try {
                  await app.get("brokerServer").ack(socketId, data)
                  cb({
                      status: "ok"
                  })
              } catch (error) {
                  cb({
                      status: "ko"
                  })
              }
          }.bind(this, socket.id));

          // On event reject (error processing, re-queue event)
          socket.on("nac", async function (socketId, data, cb) {
              try {
                  await app.get("brokerServer").nac(socketId, data)
                  cb({
                      status: "ok"
                  })
              } catch (error) {
                  cb({
                      status: "ko"
                  })
              }
          }.bind(this, socket.id));
      });
      
      // Registering Socket.io middleware
      io.use(function (socket, next) {
          // Exposing a request property to services and hooks
          socket.feathers.referrer = socket.request.referrer;
          next();
      });
  })
);

app.configure(sequelize);

// Configure other middleware (see `middleware/index.js`)
app.configure(middleware);
// Set up our services (see `services/index.js`)
app.configure(services);
// Set up event channels (see channels.js)
app.configure(channels);

// Configure a middleware for 404s and the error handler
app.use(express.notFound());
app.use(express.errorHandler({ logger }));

app.hooks(appHooks);

module.exports = app;
