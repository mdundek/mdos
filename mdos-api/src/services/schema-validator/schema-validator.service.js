// Initializes the `schema-validator` service on path `/schema-validator`
const { SchemaValidator } = require('./schema-validator.class')
const hooks = require('./schema-validator.hooks')

module.exports = function (app) {
    const options = {
        paginate: app.get('paginate'),
    }

    // Initialize our service with any options it requires
    app.use('/schema-validator', new SchemaValidator(options, app))

    // Get our initialized service so that we can register hooks
    const service = app.service('schema-validator')

    service.hooks(hooks)
}
