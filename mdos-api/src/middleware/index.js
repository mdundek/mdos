const Kube = require("./kube.js");
const Keycloak = require("./keycloak.js");

// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  // Add your custom middleware here. Remember that
  // in Express, the order matters.
  app.set("kube", new Kube(app));
  app.set("keycloak", new Keycloak(app));
}
