const app = require('../../src/app');

describe('\'gateways\' service', () => {
  it('registered the service', () => {
    const service = app.service('gateways');
    expect(service).toBeTruthy();
  });
});
