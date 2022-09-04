// Initializes the `mdos` service on path `/mdos`
const { Mdos } = require('./mdos.class')
const hooks = require('./mdos.hooks')

module.exports = function (app) {
    const options = {
        paginate: app.get('paginate'),
    }

    // Initialize our service with any options it requires
    app.use('/mdos', new Mdos(options, app))

    // Get our initialized service so that we can register hooks
    const service = app.service('mdos')

    service.hooks(hooks)
}
