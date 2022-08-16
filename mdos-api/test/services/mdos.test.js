const app = require('../../src/app');

describe('\'mdos\' service', () => {
  it('registered the service', () => {
    const service = app.service('mdos');
    expect(service).toBeTruthy();
  });
});
