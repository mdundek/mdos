const app = require('../../src/app');

describe('\'reg-authentication\' service', () => {
  it('registered the service', () => {
    const service = app.service('reg-authentication');
    expect(service).toBeTruthy();
  });
});
