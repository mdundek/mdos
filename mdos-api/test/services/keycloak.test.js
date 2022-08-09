const app = require('../../src/app');

describe('\'keycloak\' service', () => {
  it('registered the service', () => {
    const service = app.service('keycloak');
    expect(service).toBeTruthy();
  });
});
