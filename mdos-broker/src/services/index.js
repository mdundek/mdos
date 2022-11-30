const events = require('./events/events.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(events);
};
