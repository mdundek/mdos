const chalk = require('chalk');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { terminalCommand } = require("./terminal");
const https = require('https'); // or 'https' for https:// URLs
const nconf = require('nconf');
const inquirer = require('inquirer')
const { CliUx } = require('@oclif/core')
var AdmZip = require("adm-zip");
const DraftLog = require('draftlog').into(console)

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
 * success
 * @param {*} text 
 * @param {*} skipLineBefore 
 * @param {*} skipLineAFter 
 */
 const success = (text, skipLineBefore, skipLineAFter) => {
	if(!skipLineBefore) console.log();
	console.log(chalk.yellow.underline("SUCCESS"), ":", chalk.gray(text));
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
const extractErrorMessage = (error, allErrors) => {
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

	if(errorMsg.length > 0) {
		if(allErrors) {
			return errorMsg.join("\n");
		}
		else {
			let retainedError = "";
			errorMsg.forEach((msg) => {
				if(retainedError.length < msg.length)
					retainedError = msg
			});
			return retainedError;
		}
	}
	else {
		return "An unknown error occured!"
	}
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
 * @param {*} volumeName 
 * @param {*} sourceDir 
 * @param {*} targetS3Creds 
 */
const s3sync = async (s3Provider, bucket, volumeName, sourceDir, targetS3Creds) => {
	// Convenience private function to download file
	const _dl = (url, destination) => {
		return new Promise((resolve, reject) => {
			const fileStream = fs.createWriteStream(destination);
			https.get(url, function(response) {
				const code = response.statusCode ?? 0
				if (code >= 400)
					return reject(new Error(response.statusMessage))
				// handle redirects
				if (code > 300 && code < 400 && !!response.headers.location) 
					return resolve(response.headers.location);
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
		if(s3Provider == "minio") {
			mcBin = path.join(os.homedir(), ".mdos", "mc");
			if (!fs.existsSync(mcBin)) {
				try {
					CliUx.ux.action.start('Downloading Minio CLI')
					const redirect = await _dl("https://dl.min.io/client/mc/release/linux-amd64/mc", mcBin);
					if(redirect) {
						await _dl(redirect, mcBin);
					}
					CliUx.ux.action.stop()
					await terminalCommand(`chmod +x ${mcBin}`)
				} catch (err) {
					CliUx.ux.action.stop("error")
					error("Could not download Minio CLI binary");
					try { fs.unlink(mcBin); } catch (_e) { }
					process.exit(1);
				}
			}
		} else {
			error("Unsupported S3 provider: " + s3Provider);
			process.exit(1);
		}
	} else if(os.platform() === "darwin") {
		if(s3Provider == "minio") {
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
		} else {
			error("Unsupported S3 provider: " + s3Provider);
			process.exit(1);
		}
	} else if(os.platform() === "win32") {
		if(s3Provider == "minio") {
			mcBin = path.join(os.homedir(), ".mdos", "mc.exe");
			if (!fs.existsSync(mcBin)) {
				try {
					CliUx.ux.action.start('Downloading Minio CLI')
					const redirect = await _dl("https://dl.min.io/client/mc/release/windows-amd64/mc.exe", mcBin);
					if(redirect) {
						await _dl(redirect, mcBin);
					}
					CliUx.ux.action.stop()
				} catch (err) {
					CliUx.ux.action.stop("error")
					error("Could not download Minio CLI binary");
					process.exit(1);
				}
			}
		} else {
			error("Unsupported S3 provider: " + s3Provider);
			process.exit(1);
		}
	} else {
		error("Unsupported platform");
		process.exit(1);
	}

	// Get available minio aliases
	if(s3Provider == "minio") {
		let mcConfigs = null
		let aliasUpdate = true
		try {
			mcConfigs = await terminalCommand(`${mcBin} alias list --json`);
			let aliasFound = false
			let accessKeyMatch = false
			for(const a of mcConfigs) {
				const alias = JSON.parse(a)
				if(alias.alias == `${bucket}-mdosminio`) {
					aliasFound = true
					if(alias.accessKey == targetS3Creds.ACCESS_KEY)
						accessKeyMatch = true
				}
			}
			if(aliasFound && !accessKeyMatch) {
				await terminalCommand(`${mcBin} alias remove ${bucket}-mdosminio`);
			} else if(!aliasFound) {
				aliasUpdate = true
			}
		} catch (err) {
			error("Could not read Minio aliases");
			process.exit(1);
		}

		// If mdos minio alias not set up, do it now
		try {
			if(aliasUpdate)
				await terminalCommand(`${mcBin} alias set ${bucket}-mdosminio ${targetS3Creds.host} ${targetS3Creds.ACCESS_KEY} ${targetS3Creds.SECRET_KEY}`);
		} catch (err) {
			if(extractErrorCode(err) == 500) {
				error("Invalid credentials");
			} else {
				error("Invalid domain:", targetS3Creds.host);
			}
			process.exit(1);
		}

		// Sync now
		let updated = false;
		try {
			CliUx.ux.action.start(`Synchronizing volume: ${bucket}/${volumeName}`)
			const syncResult = await terminalCommand(`${mcBin} mirror ${sourceDir} ${bucket}-mdosminio/${bucket}/volumes/${volumeName} --overwrite --remove --json`);
			const changeDetected = syncResult.find(logLine => {
				const logLineJson = JSON.parse(logLine)
				if(logLineJson.status == "error") {
					throw new Error(logLineJson.error.message + ((logLineJson.error.cause && logLineJson.error.cause.message) ? `: ${logLineJson.error.cause.message}` : ""));
				}
				if(logLineJson.key && logLineJson.key != `${bucket}/volumes/${volumeName}`) {
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
			error("Could not synchronize volume:", false, true);
			context(extractErrorMessage(err), true)
			process.exit(1);
		}
		return updated
	} else {
		error("Unsupported S3 provider: " + s3Provider);
		process.exit(1);
	}
}

// /**
//  * dockerBuildKitSetup
//  */
// const dockerBuildKitSetup = async () => {
// 	// Convenience private function to download file
// 	const _dl = (url, destination) => {
// 		return new Promise((resolve, reject) => {
// 			const fileStream = fs.createWriteStream(destination);
// 			https.get(url, (response) => {
// 				const code = response.statusCode ?? 0
// 				if (code >= 400) 
// 					return reject(new Error(response.statusMessage))
// 				// handle redirects
// 				if (code > 300 && code < 400 && !!response.headers.location)
// 					return resolve(response.headers.location);
// 				response.pipe(fileStream);
// 				fileStream.on("finish", () => {
// 					fileStream.close();
// 					resolve();
// 				});
// 			}).on('error', function(err) {
// 				fs.unlink(destination);
// 				reject(err);
// 			});
// 		})
// 	}

// 	const targetDirLocation = path.join(os.homedir(), ".mdos", "buildkit");
// 	const zipLocation = path.join(targetDirLocation, "buildctl.zip");
// 	let bkBinPath;
// 	if(os.platform() === "linux") {
// 		bkBinPath = path.join(targetDirLocation, "buildctl");
// 		// TODO
// 	} else if(os.platform() === "darwin") {
// 		bkBinPath = path.join(targetDirLocation, "buildctl");
// 		if (!fs.existsSync(bkBinPath)) {
// 			fs.mkdirSync(targetDirLocation, { recursive: true })
// 			try {
// 				CliUx.ux.action.start('Installing Docker buildkit CLI')
// 				const redirect = await _dl("https://github.com/mdundek/mdos/releases/download/buildkit-bin/buildctl-darwin-amd64.zip", zipLocation);
// 				if(redirect) {
// 					await _dl(redirect, zipLocation);
// 				}
// 				const zipArchive = new AdmZip(zipLocation);
// 				zipArchive.extractAllTo(targetDirLocation, true);
// 				fs.unlinkSync(zipLocation);
// 				CliUx.ux.action.stop()
// 				await terminalCommand(`chmod +x ${bkBinPath}`)
// 			} catch (err) {
// 				CliUx.ux.action.stop("error")
// 				error("Could not download Docker buildkit CLI binary");
// 				try { fs.unlink(bkBinPath); } catch (_e) { }
// 				process.exit(1);
// 			}
// 		}
// 	} else if(os.platform() === "win32") {
// 		bkBinPath = path.join(targetDirLocation, "buildctl.exe");
// 		// TODO
// 	} else {
// 		error("Unsupported platform");
// 		process.exit(1);
// 	}
// 	return bkBinPath
// }

/**
 * buildPushComponent
 * @param {*} componentJson 
 * @param {*} root 
 */
const buildPushComponent = async (userInfo, targetRegistry, appComp, root) => {
	// PreBuild scripts?
	if(appComp.preBuildCmd) {
		try {
			for(let cmdLine of appComp.preBuildCmd) {
				CliUx.ux.action.start(`Executing pre-build command: ${cmdLine}`)
				await terminalCommand(`${cmdLine}`, false, `${root}/${appComp.name}`);
				CliUx.ux.action.stop()
			}
		} catch (err) {
			CliUx.ux.action.stop('error')
			context(extractErrorMessage(err, true), true)
			process.exit(1);
		}
	}

	// Build app image
	const targetImg = `${targetRegistry ? targetRegistry + "/" : ""}${appComp.image}:${appComp.tag}`
	try {
		CliUx.ux.action.start(`Building application image ${targetImg}`)
		await terminalCommand(`DOCKER_BUILDKIT=1 docker build -t ${targetImg} ${root}/${appComp.name}`);
		CliUx.ux.action.stop()
	} catch (err) {
		CliUx.ux.action.stop('error')
        error("Could not build application:", false, true);
		context(extractErrorMessage(err), true)
        process.exit(1);
	}

	try {
		// If mdos registry, login first
		if(targetRegistry && userInfo.registry == targetRegistry) {
			if(os.platform() === "linux") {
				await terminalCommand(`echo "${userInfo.registryPassword}" | docker login ${userInfo.registry} --username ${userInfo.registryUser} --password-stdin`);
			} else if(os.platform() === "darwin") {
				await terminalCommand(`echo "${userInfo.registryPassword}" | docker login ${userInfo.registry} --username ${userInfo.registryUser} --password-stdin`);
			} else if(os.platform() === "win32") {
				await terminalCommand(`echo | set /p="${userInfo.registryPassword}" | docker login ${userInfo.registry} --username ${userInfo.registryUser} --password-stdin`);
			} else {
				error("Unsupported platform");
				process.exit(1);
			}
		}
		// Now deploy
		CliUx.ux.action.start(`Pushing application image ${targetImg}`)
		await terminalCommand(`docker push ${targetImg}`);
		CliUx.ux.action.stop()
	} catch (err) {
		CliUx.ux.action.stop('error')
        error("Could not build application:", false, true);
		context(extractErrorMessage(err), true)
        process.exit(1);
	}
}

/**
 * isDockerInstalled
 * @returns 
 */
const isDockerInstalled = async () => {
	try {
		await terminalCommand(`docker images`);
		return true
	} catch (error) {
		return false
	}
}

const getConsoleLineHandel = (initialValue) => {
	return console.draft(initialValue);
}

module.exports = {
    info,
	success,
	error,
	warn,
	context,
	filterQuestions,
	mergeFlags,
	extractErrorCode,
	extractErrorMessage,
	s3sync,
	isDockerInstalled,
	buildPushComponent,
	getConsoleLineHandel
}