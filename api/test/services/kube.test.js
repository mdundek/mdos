const app = require('../../src/app');

describe('\'kube\' service', () => {
  it('registered the service', () => {
    const service = app.service('kube');
    expect(service).toBeTruthy();
  });
});
