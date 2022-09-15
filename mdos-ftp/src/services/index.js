const users = require('./users/users.service.js');
const credentials = require('./credentials/credentials.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(users);
  app.configure(credentials);
};
