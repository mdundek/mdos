const PureFtpDaemon = require("./pureftpDaemon");
const SequelizeInit = require("./sequelizeInit");

// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  new SequelizeInit(app).start().then(() => {
    app.set("pureFtp", new PureFtpDaemon(app));
  })
};
