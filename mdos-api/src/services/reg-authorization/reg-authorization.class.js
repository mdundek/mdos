/* eslint-disable no-unused-vars */
exports.RegAuthorization = class RegAuthorization {
  constructor (options) {
    this.options = options || {};
  }

  async find (params) {
    const credsData = Buffer.from(params.query.data, 'base64').toString('utf8');

    console.log(credsData);

    return "ok";
  }

  async get (id, params) {
    return {
      id, text: `A new message with ID: ${id}!`
    };
  }

  async create (data, params) {
    console.log(data);
    console.log(params);

    return "ok";
  }

  async update (id, data, params) {
    return data;
  }

  async patch (id, data, params) {
    return data;
  }

  async remove (id, params) {
    return { id };
  }
};
