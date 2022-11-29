const Sequelize = require('sequelize');

module.exports = function (app) {
  console.log("-->", process.env.SQLITE_FILE_PATH)
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.SQLITE_FILE_PATH,
    logging: false,
    define: {
      freezeTableName: true
    }
  });
  const oldSetup = app.setup;

  app.set('sequelizeClient', sequelize);

  app.setup = function (...args) {
    const result = oldSetup.apply(this, args);

    // Set up data relationships
    const models = sequelize.models;
    Object.keys(models).forEach(name => {
      if ('associate' in models[name]) {
        models[name].associate(models);
      }
    });

    // Sync to the database
    app.set('sequelizeSync', sequelize.sync());

    return result;
  };
};
