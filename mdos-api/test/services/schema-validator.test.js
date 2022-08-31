const app = require('../../src/app');

describe('\'schema-validator\' service', () => {
  it('registered the service', () => {
    const service = app.service('schema-validator');
    expect(service).toBeTruthy();
  });
});
