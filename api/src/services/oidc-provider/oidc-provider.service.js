// Initializes the `oidc-provider` service on path `/oidc-provider`
const { OidcProvider } = require('./oidc-provider.class');
const hooks = require('./oidc-provider.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/oidc-provider', new OidcProvider(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('oidc-provider');

  service.hooks(hooks);
};
