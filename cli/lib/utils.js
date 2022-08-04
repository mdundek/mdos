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

module.exports = {
    info
}