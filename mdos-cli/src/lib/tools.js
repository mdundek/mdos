const chalk = require('chalk');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { terminalCommand } = require("./terminal");
const https = require('https'); // or 'https' for https:// URLs
const nconf = require('nconf');
const inquirer = require('inquirer')
const { CliUx } = require('@oclif/core')

/**
 * context
 * @param {*} text 
 * @param {*} skipLineBefore 
 * @param {*} skipLineAFter 
 */
 const context = (text, skipLineBefore, skipLineAFter) => {
	if(!skipLineBefore) console.log();
	console.log(chalk.gray(text));
	if(!skipLineAFter) console.log();
}

/**
 * info
 * @param {*} text 
 * @param {*} skipLineBefore 
 * @param {*} skipLineAFter 
 */
const info = (text, skipLineBefore, skipLineAFter) => {
	if(!skipLineBefore) console.log();
	console.log(chalk.yellow.underline("INFO"), ":", chalk.gray(text));
	if(!skipLineAFter) console.log();
}

/**
 * error
 * @param {*} text 
 * @param {*} skipLineBefore 
 * @param {*} skipLineAFter 
 */
 const error = (text, skipLineBefore, skipLineAFter) => {
	if(!skipLineBefore) console.log();
	console.log(chalk.red.underline("ERROR"), ":", chalk.gray(text));
	if(!skipLineAFter) console.log();
}

/**
 * 
 * @param {*} text 
 * @param {*} skipLineBefore 
 * @param {*} skipLineAFter 
 */
 const warn = (text, skipLineBefore, skipLineAFter) => {
	if(!skipLineBefore) console.log();
	console.log(chalk.cyan.underline("WARN"), ":", chalk.gray(text));
	if(!skipLineAFter) console.log();
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

/**
 * _collectRootDomain
 * @returns 
 */
const _collectRootDomain = async () => {
	let rootDomain = nconf.get("root_domain")
	if(!rootDomain) {
		const response = await inquirer.prompt({
			group: "application",
			type: 'text',
			name: 'rootDomain',
			message: 'Enter the mdos platform root domain (ex. mycomain.com):',
			validate: (value) => {
				if(value.trim().length == 0)
					return "Mandatory field"
				return true
			}
		})
		rootDomain = response.rootDomain
		nconf.set("root_domain", rootDomain);
		nconf.save(function (err) {
			if(err) {
				console.error("Could not save config file: ");
				console.log(error);
				process.exit(1);
			}
		});
	}
	return rootDomain;
}

/**
 * s3sync
 * @param {*} tenantName 
 * @param {*} bucket 
 * @param {*} sourceDir 
 * @param {*} userInfo 
 */
const s3sync = async (tenantName, bucket, sourceDir, userInfo) => {
	// Convenience private function to download file
	const _dl = (url, destination) => {
		return new Promise((resolve, reject) => {
			const fileStream = fs.createWriteStream(destination);
			https.get(url, function(response) {
				response.pipe(fileStream);
				fileStream.on("finish", () => {
					fileStream.close();
					resolve();
				});
			}).on('error', function(err) {
				fs.unlink(destination);
				reject(err);
			});
		})
	}

	// Make sure Minio CLI is available
	let mcBin;
	if(os.platform() === "linux") {
		mcBin = path.join(os.homedir(), ".mdos", "mc");
		if (!fs.existsSync(mcBin)) {
			try {
				CliUx.ux.action.start('Downloading Minio CLI')
				await _dl("https://dl.min.io/client/mc/release/linux-amd64/mc", mcBin);
				CliUx.ux.action.stop()
				await terminalCommand(`chmod +x ${mcBin}`)
			} catch (err) {
				CliUx.ux.action.stop("error")
				error("Could not download Minio CLI binary");
				try { fs.unlink(mcBin); } catch (_e) { }
				process.exit(1);
			}
		}
	} else if(os.platform() === "darwin") {
		mcBin = "mc";
		try {
			await terminalCommand(`command -v mc`)
		} catch (_e) {
			try {
				await terminalCommand(`command -v brew`)
			} catch (_e) {
				error("Please install 'brew' first and try again");
				process.exit(1);
			}
			try {
				CliUx.ux.action.start('Installing Minio CLI')
				await terminalCommand(`brew install minio/stable/mc`)
				CliUx.ux.action.stop()

				warn("Minio CLI was installed. Please restart your command for changes to take effect")
				process.exit(1);
			} catch (_e) {
				console.log(_e);
				CliUx.ux.action.stop("error")
				error(extractErrorMessage(_e))
				process.exit(1);
			}
		}
	} else if(os.platform() === "win32") {
		mcBin = path.join(os.homedir(), ".mdos", "mc.exe");
		if (!fs.existsSync(mcBin)) {
			try {
				CliUx.ux.action.start('Downloading Minio CLI')
				await _dl("https://dl.min.io/client/mc/release/windows-amd64/mc.exe", mcBin);
				CliUx.ux.action.stop()
			} catch (err) {
				CliUx.ux.action.stop("error")
				error("Could not download Minio CLI binary");
				process.exit(1);
			}
		}
	} else {
		error("Unsupported platform");
		process.exit(1);
	}

	// Get available minio aliases
	let mcConfigs = null
	try {
		mcConfigs = await terminalCommand(`${mcBin} alias list --json`);
	} catch (err) {
		error("Could not read Minio aliases");
		process.exit(1);
	}

	// If mdos minio alias not set up, do it now
	if(!mcConfigs.find(s => JSON.parse(s).alias == "mdosminio")) {
		try {
			await terminalCommand(`${mcBin} config host add mdosminio ${userInfo.minioUri} ${userInfo.accessKey} ${userInfo.secretKey} --api S3v4`);
		} catch (err) {
			if(extractErrorCode(err) == 500) {
				error("Invalid credentials");
			} else {
				error("Invalid domain:", userInfo.minioUri);
			}
			process.exit(1);
		}
	}

	// Make sure bucket exists
	try {
		await terminalCommand(`${mcBin} mb mdosminio/${tenantName}/${bucket} --json`);
	} catch (err) {
        error("Could not synchronize volume:");
		error(extractErrorMessage(err))
        process.exit(1);
	}

	// Sync now
	let updated = false;
	try {
		CliUx.ux.action.start(`Synchronizing volume: ${tenantName}/${bucket}`)
		const syncResult = await terminalCommand(`${mcBin} mirror ${sourceDir} mdosminio/${tenantName}/${bucket} --overwrite --remove --preserve --json`);
		const changeDetected = syncResult.find(logLine => {
			const logLineJson = JSON.parse(logLine)
			if(logLineJson.key && logLineJson.key != `mdosminio/${tenantName}/${bucket}`) {
				return true
			} else if(logLineJson.source) {
				return true
			} else {
				return false
			}
		});
		updated = changeDetected ? true : false
		CliUx.ux.action.stop()
	} catch (err) {
		CliUx.ux.action.stop('error')
        error("Could not synchronize volume:");
		error(extractErrorMessage(err))
        process.exit(1);
	}
	return updated
}

module.exports = {
    info,
	error,
	warn,
	context,
	filterQuestions,
	mergeFlags,
	extractErrorCode,
	extractErrorMessage,
	s3sync
}