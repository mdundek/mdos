// Initializes the `reg-authentication` service on path `/reg-authentication`
const { RegAuthentication } = require('./reg-authentication.class');
const hooks = require('./reg-authentication.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/reg-authentication', new RegAuthentication(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('reg-authentication');

  service.hooks(hooks);
};
