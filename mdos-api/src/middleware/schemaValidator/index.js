const SchemaV1 = require("./v1")

class SchemaValidator {

    /**
     * constructor
     * @param {*} version 
     */
    constructor(version) {
        if(version.toLowerCase() == "v1") {
            this.instance = new SchemaV1();
        } else {
            throw new Error(`Schema version unknown: ${version}`);
        }
    }
}

module.exports = SchemaValidator