const app = require('../../src/app');

describe('\'token-introspect\' service', () => {
  it('registered the service', () => {
    const service = app.service('token-introspect');
    expect(service).toBeTruthy();
  });
});
