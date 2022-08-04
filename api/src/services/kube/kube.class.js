/* eslint-disable no-unused-vars */
exports.Kube = class Kube {
  constructor (options, app) {
    this.options = options || {};
    this.app = app;
  }

  async find (params) {
    try {
      switch(params.query.target) {
        case "namespaces":
          return await this.app.get("kube").getNamespaces();
      }
    } catch (error) {
      console.log(error);
    }
  }

  async get (id, params) {
    return {
      id, text: `A new message with ID: ${id}!`
    };
  }

  async create (data, params) {
    if (data.type == "secret") {
      try {
        if(await this.app.get("kube").hasSecret(data.namespace, data.name)) {
          await this.app.get("kube").replaceSecret(data.namespace, data.name, data.data);
        } else {
          await this.app.get("kube").createSecret(data.namespace, data.name, data.data);
        }
      } catch (error) {
        console.log(error);
      }
      
    }
    return data;
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
