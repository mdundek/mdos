const aclMdos = require('../_hooks/aclMdos')
const isAuthenticated = require('../_hooks/isAuthenticated')

module.exports = {
    before: {
        all: [],
        find: [isAuthenticated()],
        get: [isAuthenticated()],
        create: [aclMdos()],
        update: [aclMdos()],
        patch: [aclMdos()],
        remove: [isAuthenticated()],
    },

    after: {
        all: [],
        find: [],
        get: [],
        create: [],
        update: [],
        patch: [],
        remove: [],
    },

    error: {
        all: [],
        find: [],
        get: [],
        create: [],
        update: [],
        patch: [],
        remove: [],
    },
}
