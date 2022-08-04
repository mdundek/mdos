const oidcProvider = require('./oidc-provider/oidc-provider.service.js');
const kube = require('./kube/kube.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(oidcProvider);
  app.configure(kube);
}
