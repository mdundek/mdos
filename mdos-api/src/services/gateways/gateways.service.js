// Initializes the `gateways` service on path `/gateways`
const { Gateways } = require('./gateways.class');
const hooks = require('./gateways.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/gateways', new Gateways(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('gateways');

  service.hooks(hooks);
};
