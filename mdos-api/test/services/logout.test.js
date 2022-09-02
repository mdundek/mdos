const app = require('../../src/app');

describe('\'logout\' service', () => {
  it('registered the service', () => {
    const service = app.service('logout');
    expect(service).toBeTruthy();
  });
});
