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


module.exports = {
    info,
	error,
	warn,
	filterQuestions,
	mergeFlags
}