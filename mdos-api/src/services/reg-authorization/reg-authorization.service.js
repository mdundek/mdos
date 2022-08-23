// Initializes the `reg-authorization` service on path `/reg-authorization`
const { RegAuthorization } = require('./reg-authorization.class');
const hooks = require('./reg-authorization.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/reg-authorization', new RegAuthorization(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('reg-authorization');

  service.hooks(hooks);
};
