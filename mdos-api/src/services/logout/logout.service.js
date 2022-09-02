// Initializes the `logout` service on path `/logout`
const { Logout } = require('./logout.class');
const hooks = require('./logout.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/logout', new Logout(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('logout');

  service.hooks(hooks);
};
