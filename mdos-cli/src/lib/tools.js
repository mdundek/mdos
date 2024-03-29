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
        return mainErrMessage.length > 0 ? mainErrMessage.join('\n') : "An unknown server error occurred"
    } else {
        return 'An unknown error occurred!'
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
 * _dockerLogin
 * @param {*} creds 
 */
 const _dockerLogin = async(creds) => {
    if (os.platform() === 'linux') {
        await terminalCommand(
            `echo "${creds.password}" | docker login${creds.registry ? " "+creds.registry : ""} --username ${creds.username} --password-stdin`
        )
    } else if (os.platform() === 'darwin') {
        await terminalCommand(
            `echo "${creds.password}" | docker login${creds.registry ? " "+creds.registry : ""} --username ${creds.username} --password-stdin`
        )
    } else if (os.platform() === 'win32') {
        await terminalCommand(
            `echo | set /p="${creds.password}" | docker login${creds.registry ? " "+creds.registry : ""} --username ${creds.username} --password-stdin`
        )
    } else {
        error('Unsupported platform')
        process.exit(1)
    }
}

/**
 * _prebuildScriptsOnDeploy
 * @param {*} appComp 
 * @param {*} root 
 */
const _prebuildScriptsOnDeploy = async (appComp, root) => {
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

/**
 * _pushImage
 * @param {*} targetImg 
 */
const _pushImage = async (targetImg) => {
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
 * Build and push a component docker image to the mdos registry
 *
 * @param {*} userInfo
 * @param {*} regCreds
 * @param {*} appComp
 * @param {*} root
 * @param {*} tenantName
 */
const buildPushComponent = async (userInfo, regCreds, appComp, root, tenantName) => {
    // PreBuild scripts if any
    if (appComp.preBuildCmd) await _prebuildScriptsOnDeploy(appComp, root)

    // Construct registry image name if necessary
    let targetImg
    if(!appComp.publicRegistry && regCreds.registry) {
        if(userInfo.registry == regCreds.registry) {
            // MDos registry target, append namespace name to image path
            if(appComp.image.indexOf('/') == 0) appComp.image = `${tenantName}${appComp.image}`
            else appComp.image = `${tenantName}/${appComp.image}`
        }
        targetImg = `${regCreds.registry ? regCreds.registry + '/' : ''}${appComp.image}:${appComp.tag}`
    } else {
        targetImg = `${appComp.image}:${appComp.tag}`
    }

    // Build image
    try {
        CliUx.ux.action.start(`Building application image ${targetImg}`)
        await terminalCommand(`DOCKER_BUILDKIT=1 docker build -t ${targetImg} ${root}/${appComp.name}`)
        CliUx.ux.action.stop()
    } catch (err) {
        CliUx.ux.action.stop('error')
        error('Could not build application:', false, true)
        context(extractErrorMessage(err, true), true, true)
        process.exit(1)
    }

    // Login to registry
    try {
        await _dockerLogin(regCreds)
    } catch (err) {
        error(`Could not login to registry "${regCreds.registry ? regCreds.registry : "docker.io"}" with username: ${regCreds.username}`, false, true)
        process.exit(1)
    }

    // Now push image
    await _pushImage(targetImg)
}

/**
 * Build and push a component docker image
 *
 * @param {*} regCreds
 * @param {*} appComp
 * @param {*} root
 */
 const buildPushComponentFmMode = async (regCreds, appComp, root) => {
    // PreBuild scripts?
    if (appComp.preBuildCmd) await _prebuildScriptsOnDeploy(appComp, root)

    // Construct registry image name if necessary
    const targetImg = `${regCreds.registry ? regCreds.registry + '/' : ''}${appComp.image}:${appComp.tag}`
   
    // Build image
    try {
        CliUx.ux.action.start(`Building application image ${targetImg}`)
        await terminalCommand(`DOCKER_BUILDKIT=1 docker build -t ${targetImg} ${root}/${appComp.name}`)
        CliUx.ux.action.stop()
    } catch (err) {
        CliUx.ux.action.stop('error')
        error('Could not build application:', false, true)
        context(extractErrorMessage(err, true), true, true)
        process.exit(1)
    }

    // Login to registry
    try {
        await _dockerLogin(regCreds)
    } catch (err) {
        error(`Could not login to registry "${regCreds.registry ? regCreds.registry : "docker.io"}" with username: ${regCreds.username}`, false, true)
        process.exit(1)
    }

    // Now push image
    await _pushImage(targetImg)
}

/**
 * Logout from mdos registry
 *
 * @param {*} registry
 */
const dockerLogout = async (registry) => {
    try {
        await terminalCommand(`docker logout ${registry}`)
    } catch (err) {}
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
    } catch (err) {
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

                if (component.networkPolicy) {
                    const netPolName = `${'Network Policy'}: ${chalk.gray(component.networkPolicy.scope)}`
                    treeData[appNodeName][appCompNodeName][netPolName] = {}
                }
                if (component.services) {
                    treeData[appNodeName][appCompNodeName]['Services:'] = {}
                    for (const service of component.services) {
                        let svcString = `(Ports: ${service.ports.map(p => p.port).join(', ')})`
                        treeData[appNodeName][appCompNodeName]['Services:'][`${service.name}: ${chalk.gray(svcString)}`] = null
                    }
                }
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
                if (component.volumes) {
                    treeData[appNodeName][appCompNodeName]['Volumes:'] = {}
                    for (const volume of component.volumes) {
                        let volString
                        if(!volume.hostPath)
                            volString = `(Size: ${volume.size}, MountPath: ${volume.mountPath})`
                        else
                            volString = `(HostPath: ${volume.hostPath}, MountPath: ${volume.mountPath})`
                        treeData[appNodeName][appCompNodeName]['Volumes:'][`${volume.name}: ${chalk.gray(volString)}`] = null
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
