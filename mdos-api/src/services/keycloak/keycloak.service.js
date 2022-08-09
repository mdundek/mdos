// Initializes the `keycloak` service on path `/keycloak`
const { Keycloak } = require('./keycloak.class');
const hooks = require('./keycloak.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/keycloak', new Keycloak(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('keycloak');

  service.hooks(hooks);
};
