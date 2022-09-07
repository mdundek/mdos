// Initializes the `direct-login` service on path `/direct-login`
const { DirectLogin } = require('./direct-login.class');
const hooks = require('./direct-login.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/direct-login', new DirectLogin(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('direct-login');

  service.hooks(hooks);
};
