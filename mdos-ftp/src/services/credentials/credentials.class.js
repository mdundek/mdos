/* eslint-disable no-unused-vars */
exports.Credentials = class Credentials {
  constructor (options, app) {
    this.options = options || {};
    this.app = app;
  }

  /**
   * create
   * @param {} data 
   * @param {*} params 
   * @returns 
   */
  async create (data, params) {
    const credData = await this.app.get("pureFtp").createTenantCredentials(data.tenantName)
    return credData;
  }

  /**
   * remove
   * @param {*} id 
   * @param {*} params 
   */
  async remove (id, params) {
    await this.app.get("pureFtp").deleteTenantCredentials(id)
    return {status: "ok"}
  }
};
