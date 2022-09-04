/* eslint-disable no-unused-vars */
exports.SchemaValidator = class SchemaValidator {

    /**
     * Creates an instance of SchemaValidator.
     * @param {*} options
     * @param {*} app
     */
    constructor(options, app) {
        this.options = options || {}
        this.app = app
    }

    /**
     * Update
     *
     * @param {*} id
     * @param {*} data
     * @param {*} params
     * @return {*} 
     */
    async update(id, data, params) {
        return this.app.get('schemaValidator')[id].instance.validate(data)
    }
}
