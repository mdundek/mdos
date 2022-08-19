// const sysadmin_role_check = require('../_hooks/sysadminOnly');
const aclDataFindFilter = require('../_hooks/aclAfterfindFilters');
const aclDataCreate = require('../_hooks/aclAfterCreate');
const aclDataDelete = require('../_hooks/aclAfterDelete');

module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [aclDataCreate()],
    update: [aclDataCreate()],
    patch: [aclDataCreate()],
    remove: [aclDataDelete()]
  },

  after: {
    all: [],
    find: [aclDataFindFilter()],
    get: [aclDataFindFilter()],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
