const SchemaV1 = require('./v1')

/**
 * Validate mdos application schemas
 *
 * @class SchemaValidator
 */
class SchemaValidator {
    
    /**
     * Creates an instance of SchemaValidator.
     * @param {*} version
     * @memberof SchemaValidator
     */
    constructor(version) {
        if (version.toLowerCase() == 'v1') {
            this.instance = new SchemaV1()
        } else {
            throw new Error(`ERROR: Schema version unknown: ${version}`)
        }
    }
}

module.exports = SchemaValidator
