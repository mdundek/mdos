const chalk = require('chalk')
const os = require('os')
const fs = require('fs')
const path = require('path')
const { terminalCommand } = require('./terminal')
const https = require('https')
const inquirer = require('inquirer')
const { CliUx } = require('@oclif/core')
var AdmZip = require('adm-zip')
const DraftLog = require('draftlog').into(console)


/**
 * Print context log line
 *
 * @param {*} text
 * @param {*} skipLineBefore
 * @param {*} skipLineAFter
 */
const context = (text, skipLineBefore, skipLineAFter) => {
    if (!skipLineBefore) console.log()
    console.log(chalk.gray(text))
    if (!skipLineAFter) console.log()
}


/**
 * Print info log line
 *
 * @param {*} text
 * @param {*} skipLineBefore
 * @param {*} skipLineAFter
 */
const info = (text, skipLineBefore, skipLineAFter) => {
    if (!skipLineBefore) console.log()
    console.log(chalk.yellow.underline('INFO'), ':', chalk.gray(text))
    if (!skipLineAFter) console.log()
}


/**
 * Print success log line
 *
 * @param {*} text
 * @param {*} skipLineBefore
 * @param {*} skipLineAFter
 */
const success = (text, skipLineBefore, skipLineAFter) => {
    if (!skipLineBefore) console.log()
    console.log(chalk.yellow.underline('SUCCESS'), ':', chalk.gray(text))
    if (!skipLineAFter) console.log()
}


/**
 * Print error log line
 *
 * @param {*} text
 * @param {*} skipLineBefore
 * @param {*} skipLineAFter
 */
const error = (text, skipLineBefore, skipLineAFter) => {
    if (!skipLineBefore) console.log()
    console.log(chalk.red.underline('ERROR'), ':', chalk.gray(text))
    if (!skipLineAFter) console.log()
}


/**
 * Print warn log line
 *
 * @param {*} text
 * @param {*} skipLineBefore
 * @param {*} skipLineAFter
 */
const warn = (text, skipLineBefore, skipLineAFter) => {
    if (!skipLineBefore) console.log()
    console.log(chalk.cyan.underline('WARN'), ':', chalk.gray(text))
    if (!skipLineAFter) console.log()
}


/**
 * Filter inquirer questions based on target string
 *
 * @param {*} questions
 * @param {*} group
 * @param {*} flags
 * @return {*} 
 */
const filterQuestions = (questions, group, flags) => {
    return questions.filter((q) => q.group == group).filter((q) => Object.keys(flags).find((fKey) => fKey == q.name) == null)
}


/**
 * Merge Flag values and user responses into one object
 *
 * @param {*} responses
 * @param {*} flags
 * @return {*} 
 */
const mergeFlags = (responses, flags) => {
    let omitNull = (obj) => {
        Object.keys(obj)
            .filter((k) => obj[k] === null)
            .forEach((k) => delete obj[k])
        return obj
    }
    return { ...omitNull(responses), ...omitNull(flags) }
}


/**
 * Extract error code from error object
 *
 * @param {*} error
 * @param {*} exclude
 * @return {*} 
 */
const extractErrorCode = (error, exclude) => {
    let errorCode = null

    if (typeof error === 'string' || error instanceof String) {
        errorCode = _isPositiveInteger(error) ? parseInt(error) : 500
    } else if (error.response && error.response.status) {
        errorCode = error.response.status
    } else if (error.data && error.data.status) {
        errorCode = error.data.status
    } else if (error.data && error.data.code) {
        errorCode = error.data.code
    } else if (error.code != undefined) {
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorCode = 503
        } else if (Number.isInteger(error.code)) {
            errorCode = error.code
        } else {
            if ((typeof error.code === 'string' || error.code instanceof String) && _isPositiveInteger(error.code)) {
                errorCode = parseInt(error.code)
            } else {
                console.log('UNKNOWN ERROR CODE =>', error.code, ', TYPE:', typeof error.code)
                errorCode = 500
            }
        }
    } else {
        errorCode = 500
    }
    return !exclude || (exclude && exclude.indexOf(errorCode) == -1) ? errorCode : 500
}


/**
 * Extract error message from error objectt
 *
 * @param {*} error
 * @return {*} 
 */
const extractErrorMessage = (error, all) => {
    if (typeof error === 'string' || error instanceof String) {
        return error
    }
    let errorMsg = []
    if (error.message) {
        errorMsg.push(error.message)
    }
    if (error.response && error.response.statusText && errorMsg.indexOf(error.response.statusText) == -1) {
        errorMsg.push(error.response.statusText)
    }
    if (error.response && error.response.data && error.response.data.message && errorMsg.indexOf(error.response.data.message) == -1) {
        errorMsg.push(error.response.data.message)
    }
    
    if (errorMsg.length > 0) {
        let mainErrMessage
        if(!all) mainErrMessage = errorMsg.filter(msg => msg.indexOf("ERROR: ") == 0).map(msg => msg.substring(7))
        else mainErrMessage = errorMsg.map(msg => msg)
        return mainErrMessage.length > 0 ? mainErrMessage.join('\n') : "An unknown server error occured"
    } else {
        return 'An unknown error occured!'
    }
}

/**
 * Private: Is integer string a positive value
 *
 * @param {*} str
 * @return {*} 
 */
const _isPositiveInteger = (str) => {
    if (typeof str !== 'string') {
        return false
    }
    const num = Number(str)
    if (Number.isInteger(num) && num > 0) {
        return true
    }
    return false
}

/**
 * Synchronize current vvolume over lftp
 *
 * @param {*} sourceDir
 * @param {*} appName
 * @param {*} creds
 * @return {*} 
 */
const lftp = async (sourceDir, appName, creds) => {
    try {
        CliUx.ux.action.start(`Synching volumes`)
        const result = await terminalCommand(`docker run --name mdos-mirror-lftp --rm -e PROTOCOL=${creds.protocol} -e HOST=${creds.host} -e PORT=${creds.port} -e USERNAME=${creds.username} -e PASSWORD=${creds.password} -e LOCAL_DIR=/usr/src/${appName} -e REMOTE_DIR=./ -e PARALLEL=2 -v ${sourceDir}:/usr/src/${appName}/volumes docker.io/mdundek/mdos-mirror-lftp:latest sh /usr/local/bin/r-mirror.sh`)
        CliUx.ux.action.stop()
        return result.length > 0
    } catch (err) {
        CliUx.ux.action.stop('error')
        error('Could not sync volume:', false, true)
        context(extractErrorMessage(err), true)
        process.exit(1)
    }
}

/**
 * Build and push a component docker image to the mdos registry
 *
 * @param {*} userInfo
 * @param {*} regCreds
 * @param {*} targetRegistry
 * @param {*} appComp
 * @param {*} root
 */
const buildPushComponent = async (userInfo, regCreds, targetRegistry, appComp, root, tenantName) => {
    // PreBuild scripts?
    if (appComp.preBuildCmd) {
        try {
            for (let cmdLine of appComp.preBuildCmd) {
                CliUx.ux.action.start(`Executing pre-build command: ${cmdLine}`)
                await terminalCommand(`${cmdLine}`, false, `${root}/${appComp.name}`)
                CliUx.ux.action.stop()
            }
        } catch (err) {
            CliUx.ux.action.stop('error')
            context(extractErrorMessage(err), true)
            process.exit(1)
        }
    }

    // Build app image
    if (!appComp.imagePullSecrets && !appComp.publicRegistry) {
        // MDos registry target, append namespace name to image path
        if(appComp.image.indexOf('/') == 0)
            appComp.image = `${tenantName}${appComp.image}`
        else
            appComp.image = `${tenantName}/${appComp.image}`
    }
    const targetImg = `${targetRegistry ? targetRegistry + '/' : ''}${appComp.image}:${appComp.tag}`
    try {
        CliUx.ux.action.start(`Building application image ${targetImg}`)
        await terminalCommand(`DOCKER_BUILDKIT=1 docker build -t ${targetImg} ${root}/${appComp.name}`)
        CliUx.ux.action.stop()
    } catch (err) {
        CliUx.ux.action.stop('error')
        error('Could not build application:', false, true)
        context(extractErrorMessage(err), true)
        process.exit(1)
    }

    try {
        // If mdos registry, login first
        if (targetRegistry && userInfo.registry == targetRegistry) {
            if (os.platform() === 'linux') {
                await terminalCommand(
                    `echo "${regCreds.password}" | docker login ${userInfo.registry} --username ${regCreds.username} --password-stdin`
                )
            } else if (os.platform() === 'darwin') {
                await terminalCommand(
                    `echo "${regCreds.password}" | docker login ${userInfo.registry} --username ${regCreds.username} --password-stdin`
                )
            } else if (os.platform() === 'win32') {
                await terminalCommand(
                    `echo | set /p="${regCreds.password}" | docker login ${userInfo.registry} --username ${regCreds.username} --password-stdin`
                )
            } else {
                error('Unsupported platform')
                process.exit(1)
            }
        }
        // Now deploy
        CliUx.ux.action.start(`Pushing application image ${targetImg}`)
        await terminalCommand(`docker push ${targetImg}`)
        CliUx.ux.action.stop()
    } catch (err) {
        CliUx.ux.action.stop('error')
        error('Could not build application:', false, true)
        context(extractErrorMessage(err), true)
        process.exit(1)
    }
}

/**
 * Build and push a component docker image
 *
 * @param {*} regCreds
 * @param {*} targetRegistry
 * @param {*} appComp
 * @param {*} root
 */
 const buildPushComponentFmMode = async (targetRegistry, regCreds, appComp, root) => {
    // PreBuild scripts?
    if (appComp.preBuildCmd) {
        try {
            for (let cmdLine of appComp.preBuildCmd) {
                CliUx.ux.action.start(`Executing pre-build command: ${cmdLine}`)
                await terminalCommand(`${cmdLine}`, false, `${root}/${appComp.name}`)
                CliUx.ux.action.stop()
            }
        } catch (err) {
            CliUx.ux.action.stop('error')
            context(extractErrorMessage(err), true)
            process.exit(1)
        }
    }

    const targetImg = `${targetRegistry ? targetRegistry + '/' : ''}${appComp.image}:${appComp.tag}`
    try {
        CliUx.ux.action.start(`Building application image ${targetImg}`)
        await terminalCommand(`DOCKER_BUILDKIT=1 docker build -t ${targetImg} ${root}/${appComp.name}`)
        CliUx.ux.action.stop()
    } catch (err) {
        CliUx.ux.action.stop('error')
        error('Could not build application:', false, true)
        context(extractErrorMessage(err), true)
        process.exit(1)
    }

    // If mdos registry, login first
    if (targetRegistry && regCreds) {
        try {
            if (os.platform() === 'linux') {
                await terminalCommand(
                    `echo "${regCreds.password}" | docker login ${targetRegistry} --username ${regCreds.username} --password-stdin`
                )
            } else if (os.platform() === 'darwin') {
                await terminalCommand(
                    `echo "${regCreds.password}" | docker login ${targetRegistry} --username ${regCreds.username} --password-stdin`
                )
            } else if (os.platform() === 'win32') {
                await terminalCommand(
                    `echo | set /p="${regCreds.password}" | docker login ${targetRegistry} --username ${regCreds.username} --password-stdin`
                )
            } else {
                error('Unsupported platform')
                process.exit(1)
            }
        } catch (err) {
            error('Could not login to the registry: ' + targetRegistry, false, true)
            process.exit(1)
        }
    }
    // Now deploy
    CliUx.ux.action.start(`Pushing application image ${targetImg}`)

    try {
        await terminalCommand(`docker push ${targetImg}`)
        CliUx.ux.action.stop()
    } catch (err) {
        CliUx.ux.action.stop('error')
        error('Could not push image to registry:', false, true)
        context(extractErrorMessage(err, true), true)
        process.exit(1)
    }
}

/**
 * Logout from mdos registry
 *
 * @param {*} registry
 */
const dockerLogout = async (registry) => {
    try {
        await terminalCommand(`docker logout ${registry}`)
    } catch (error) {}
}


/**
 * Tests is docker is installed
 *
 * @return {*} 
 */
const isDockerInstalled = async () => {
    try {
        await terminalCommand(`docker images`)
        return true
    } catch (error) {
        return false
    }
}


/**
 * Get a new line handle for multi-line value updates in the terminal session 
 *
 * @param {*} initialValue
 * @return {*} 
 */
const getConsoleLineHandel = (initialValue) => {
    return console.draft(initialValue)
}

/**
 * Create an application tree from application list for CLI
 *
 * @param {*} data
 * @return {*} 
 */
const computeApplicationTree = (data, appendNamespace) => {
    let treeData = {}
    for (const app of data) {
        if (app.isHelm) {
            const appNodeName = `${chalk.red('MDos application')}: ${chalk.gray(app.name)} ${appendNamespace ? chalk.yellow(`(Namespace: ${app.namespace})`) : ""}`
            treeData[appNodeName] = {}
            for (const component of app.values.components) {
                const appCompNodeName = `${chalk.blue('Component')}: ${chalk.gray(component.name)}`
                treeData[appNodeName][appCompNodeName] = {}
                if (component.ingress && component.ingress.length > 0) {
                    treeData[appNodeName][appCompNodeName]['Ingress:'] = {}
                    for (const ingress of component.ingress) {
                        treeData[appNodeName][appCompNodeName]['Ingress:'][`Host: ${chalk.gray(ingress.matchHost)}`] = null
                    }
                }
                if (component.oidc) {
                    const oidcProviderName = `SSO (OIDC Provider '${chalk.gray(component.oidc.provider)}'):`
                    treeData[appNodeName][appCompNodeName][oidcProviderName] = {}
                    for (const host of component.oidc.hosts) {
                        treeData[appNodeName][appCompNodeName][oidcProviderName][`Host: ${chalk.gray(host)}`] = null
                    }
                }
            }
        } else {
            const appNodeName = `${chalk.red('Application')}: ${chalk.gray(app.name)}`
            treeData[appNodeName] = null
        }
    }
    return treeData
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
    lftp,
    isDockerInstalled,
    buildPushComponent,
    buildPushComponentFmMode,
    getConsoleLineHandel,
    dockerLogout,
    computeApplicationTree,
}
