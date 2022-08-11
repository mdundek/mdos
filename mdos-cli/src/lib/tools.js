const chalk = require('chalk');

/**
 * info
 * @param {*} text 
 */
const info = (text) => {
	console.log();
	console.log(chalk.yellow.underline("INFO"), ":", chalk.gray(text));
	console.log();
}

/**
 * error
 * @param {*} text 
 */
 const error = (text) => {
	console.log();
	console.log(chalk.red.underline("ERROR"), ":", chalk.gray(text));
	console.log();
}

/**
 * warn
 * @param {*} text 
 */
 const warn = (text) => {
	console.log();
	console.log(chalk.cyan.underline("WARN"), ":", chalk.gray(text));
	console.log();
}

/**
 * filterQuestions
 * @param {*} questions 
 * @param {*} group 
 */
const filterQuestions = (questions, group, flags) => {
	return questions
		.filter(q => q.group == group)
		.filter(q => Object.keys(flags).find(fKey => fKey == q.name) == null);
}

/**
 * mergeFlags
 * @param {*} responses 
 * @param {*} flags 
 * @returns 
 */
const mergeFlags = (responses, flags) => {
	let omitNull = obj => {
		Object.keys(obj).filter(k => obj[k] === null).forEach(k => delete(obj[k]))
		return obj
	}
	return { ...omitNull(responses), ...omitNull(flags) }
}

/**
 * extractCode
 * @param {*} error 
 * @param {*} exclude 
 * @returns 
 */
 const extractErrorCode = (error, exclude) => {
	let errorCode = null;

	if (typeof error === 'string' || error instanceof String) {
		errorCode = _isPositiveInteger(error) ? parseInt(error) : 500;
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
			if ((typeof error.code === 'string' || error.code instanceof String) && _isPositiveInteger(error.code)) {
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
const extractErrorMessage = (error) => {
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
const _isPositiveInteger = (str) => {
	if (typeof str !== 'string') {
	  return false;
	}
	const num = Number(str);
	if (Number.isInteger(num) && num > 0) {
	  return true;
	}
	return false;
}

module.exports = {
    info,
	error,
	warn,
	filterQuestions,
	mergeFlags,
	extractErrorCode,
	extractErrorMessage
}