const errors = require('@feathersjs/errors')
const pjson = require('../../../package.json');

/**
 * Export
 *
 * @return {*} 
 */
module.exports = function () {
    return async (context) => {
        if (context.params.provider != 'rest' || !context.params.headers['mdos_version']) return context

        const cliVersionBreakdown = context.params.headers['mdos_version'].split(".").map(v => parseInt(v))
        const apiVersionBreakdown = pjson.version.split(".").map(v => parseInt(v))

        if(apiVersionBreakdown[0] > cliVersionBreakdown[0]) {
            throw new errors.NotAcceptable(`ERROR: Your CLI is on version ${context.params.headers['mdos_version']}, but the MDos API server is on version ${pjson.version}. Please update your MDos CLI version.`)
        } else if(apiVersionBreakdown[0] == cliVersionBreakdown[0] && apiVersionBreakdown[1] > cliVersionBreakdown[1]) {
            throw new errors.NotAcceptable(`ERROR: Your CLI is on version ${context.params.headers['mdos_version']}, but the MDos API server is on version ${pjson.version}. Please update your MDos CLI version.`)
        } else if(apiVersionBreakdown[0] < cliVersionBreakdown[0]) {
            throw new errors.NotAcceptable(`ERROR: Your CLI is on version ${context.params.headers['mdos_version']}, but the MDos API server is on version ${pjson.version}. Please update your MDos platform version.`)
        } else if(apiVersionBreakdown[0] == cliVersionBreakdown[0] && apiVersionBreakdown[1] < cliVersionBreakdown[1]) {
            throw new errors.NotAcceptable(`ERROR: Your CLI is on version ${context.params.headers['mdos_version']}, but the MDos API server is on version ${pjson.version}. Please update your MDos platform version.`)
        }

        return context
    }
}
