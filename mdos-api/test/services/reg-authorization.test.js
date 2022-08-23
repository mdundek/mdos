const app = require('../../src/app');

describe('\'reg-authorization\' service', () => {
  it('registered the service', () => {
    const service = app.service('reg-authorization');
    expect(service).toBeTruthy();
  });
});
