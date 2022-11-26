// Initializes the `events` service on path `/events`
const { Events } = require('./events.class');
const createModel = require('../../models/events.model');
const hooks = require('./events.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/events', new Events(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('events');

  service.hooks(hooks);
};
