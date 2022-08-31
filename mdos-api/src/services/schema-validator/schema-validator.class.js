/* eslint-disable no-unused-vars */
exports.SchemaValidator = class SchemaValidator {
  constructor (options, app) {
    this.options = options || {};
    this.app = app;
  }

  async find (params) {
    return [];
  }

  async get (id, params) {
    return {
      id, text: `A new message with ID: ${id}!`
    };
  }

  async create (data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this.create(current, params)));
    }

    return data;
  }

  async update (id, data, params) {
    return this.app.get("schemaValidator")[id].instance.validate(data)
  }

  async patch (id, data, params) {
    return data;
  }

  async remove (id, params) {
    return { id };
  }
};
