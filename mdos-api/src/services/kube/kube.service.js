// Initializes the `kube` service on path `/kube`
const { Kube } = require('./kube.class')
const hooks = require('./kube.hooks')

module.exports = function (app) {
    const options = {
        paginate: app.get('paginate'),
    }

    // Initialize our service with any options it requires
    app.use('/kube', new Kube(options, app))

    // Get our initialized service so that we can register hooks
    const service = app.service('kube')

    service.hooks(hooks)
}
