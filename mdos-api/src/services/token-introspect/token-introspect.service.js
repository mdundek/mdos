// Initializes the `token-introspect` service on path `/token-introspect`
const { TokenIntrospect } = require('./token-introspect.class');
const hooks = require('./token-introspect.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/token-introspect', new TokenIntrospect(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('token-introspect');

  service.hooks(hooks);
};
