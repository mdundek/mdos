const app = require('../../src/app');

describe('\'direct-login\' service', () => {
  it('registered the service', () => {
    const service = app.service('direct-login');
    expect(service).toBeTruthy();
  });
});
