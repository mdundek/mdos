const aclMdos = require('../_hooks/aclMdos')

module.exports = {
    before: {
        all: [],
        find: [],
        get: [],
        create: [aclMdos()],
        update: [aclMdos()],
        patch: [aclMdos()],
        remove: [],
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
