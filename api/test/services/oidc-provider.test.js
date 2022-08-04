const app = require('../../src/app');

describe('\'oidc-provider\' service', () => {
  it('registered the service', () => {
    const service = app.service('oidc-provider');
    expect(service).toBeTruthy();
  });
});
