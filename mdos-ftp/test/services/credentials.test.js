const app = require('../../src/app');

describe('\'credentials\' service', () => {
  it('registered the service', () => {
    const service = app.service('credentials');
    expect(service).toBeTruthy();
  });
});
