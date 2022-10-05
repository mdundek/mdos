class ErrorUtils {

    /**
     * extractCode
     * @param {*} error 
     * @param {*} exclude 
     * @returns 
     */
    static extractCode(error, exclude) {
        let errorCode = null;

        if (typeof error === 'string' || error instanceof String) {
            errorCode = this._isPositiveInteger(error) ? parseInt(error) : 500;
        }
        else if (error.response && error.response.status) {
            errorCode = error.response.status;
        }
        else if (error.data && error.data.status) {
            errorCode = error.data.status;
        }
        else if (error.data && error.data.code) {
            errorCode = error.data.code;
        }
        else if (error.code != undefined) {
            if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
                errorCode = 503;
            } else if (Number.isInteger(error.code)) {
                errorCode = error.code;
            } else {
                if ((typeof error.code === 'string' || error.code instanceof String) && this._isPositiveInteger(error.code)) {
                   errorCode = parseInt(error.code);
                } else {
                    console.log("UNKNOWN ERROR CODE =>", error.code, ", TYPE:", typeof error.code);
                    errorCode = 500;
                }
            }
        }
        else {
            errorCode = 500;
        }
        return (!exclude || (exclude && exclude.indexOf(errorCode) == -1)) ? errorCode : 500;
    }

    /**
     * extractMessage
     * @param {*} error 
     * @returns 
     */
    static extractMessage(error) {
        if (typeof error === 'string' || error instanceof String) {
            return error;
        }

        let errorMsg = [];
        if(error.message) {
            errorMsg.push(error.message);
        }
        if(error.response && error.response.statusText && errorMsg.indexOf(error.response.statusText) == -1) {
            errorMsg.push(error.response.statusText);
        }
        if(error.response && error.response.data && error.response.data.message && errorMsg.indexOf(error.response.data.message) == -1) {
            errorMsg.push(error.response.data.message);
        }
        if(error.data && error.data.message && errorMsg.indexOf(error.data.message) == -1) {
            errorMsg.push(error.data.message);
        }
        if(errorMsg.length > 0)
            return errorMsg.join("\n");
        else
            return "An unknown error occured!"
    }

    /**
     * _isPositiveInteger
     * @param {*} str 
     * @returns 
     */
    static _isPositiveInteger(str) {
        if (typeof str !== 'string') {
          return false;
        }
        const num = Number(str);
        if (Number.isInteger(num) && num > 0) {
          return true;
        }
        return false;
    }
}

module.exports = ErrorUtils