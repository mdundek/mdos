import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { success, context, error, lftp, isDockerInstalled, buildPushComponent } = require('../../lib/tools')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

/**
 * Command
 *
 * @export
 * @class Deploy
 * @extends {Command}
 */
export default class Deploy extends Command {
    static aliases = ['app:deploy', 'deploy:app', 'deploy:application', 'deploy:applications', 'applications:deploy']
    static description = 'Deploy an application from the current directory'

    // ******* FLAGS *******
    static flags = {
        username: Flags.string({ char: 'u', description: 'Registry username' }),
        password: Flags.string({ char: 'p', description: 'Registry password' }),
    }
    // *********************

    regCreds: any

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Deploy)

        // Make sure docker is installed
        const dockerInstalled = await isDockerInstalled()
        if (!dockerInstalled) {
            error('To build images, you need to install Docker first:', false, true)
            context('https://docs.docker.com/engine/install/', true, false)
            process.exit(1)
        }

        // Detect mdos project yaml file
        let appYamlPath = path.join(process.cwd(), 'mdos.yaml')
        let appRootDir = process.cwd()
        if (!fs.existsSync(appYamlPath)) {
            appYamlPath = path.join(path.dirname(process.cwd()), 'mdos.yaml')
            if (!fs.existsSync(appYamlPath)) {
                error("You don't seem to be in a mdos project folder")
                process.exit(1)
            }
            appRootDir = path.dirname(process.cwd())
        }

        // Load mdos yaml file
        let appYamlBase64
        let appYaml: {
            [x: string]: any
            schemaVersion: string
            components: any
            registry: any
            tenantName: any
        }
        try {
            const yamlString = fs.readFileSync(appYamlPath, 'utf8')
            appYaml = YAML.parse(yamlString)
            appYamlBase64 = Buffer.from(yamlString, 'utf-8').toString('base64')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Validate app schema
        if (!appYaml.schemaVersion || typeof appYaml.schemaVersion != 'string') {
            error('Missing schema version in your manifest (expected property: schemaVersion)')
            process.exit(1)
        }

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Validate application schema
        const response = await this.api('schema-validator/v1', 'put', appYaml)
        if (response.data.length > 0) {
            response.data.forEach((errorObj: any) => {
                error(errorObj.stack, false, true)
                context(JSON.stringify(errorObj.instance, null, 4), true, true)
            })
            process.exit(1)
        }

        // Read certificates if any and replace cert paths with actual values
        for (const component of appYaml.components) {
            if (component.ingress) {
                for (const ingress of component.ingress) {
                    if (ingress.tlsKeyPath) {
                        if (!fs.existsSync(ingress.tlsKeyPath)) {
                            error(`File: '${ingress.tlsKeyPath}' not found`)
                            process.exit(1)
                        }
                        ingress.tlsKeyPath = fs.readFileSync(ingress.tlsKeyPath, 'utf8').toString()
                    }
                    if (ingress.tlsCrtPath) {
                        if (!fs.existsSync(ingress.tlsCrtPath)) {
                            error(`File: '${ingress.tlsCrtPath}' not found`)
                            process.exit(1)
                        }
                        ingress.tlsCrtPath = fs.readFileSync(ingress.tlsCrtPath, 'utf8').toString()
                    }
                }
            }
        }

        // Make sure namespace has been created before we do anything else
        let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
        if (!nsResponse.data.find((ns: { name: string }) => ns.name == appYaml.tenantName)) {
            error(`Namespace '${appYaml.tenantName}' does not yet exists. It needs to be created first using the command 'mdos namespace create' before you can deploy applications to this namespace.`)
            process.exit(1)
        }

        // Get credentials for lftp
        let userInfo
        try {
            userInfo = await this.api(`mdos/user-info?namespace=${appYaml.tenantName}&appName=${appYaml.appName}`, 'GET')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Sync volumes
        let volSourcePath = path.join(appRootDir, 'volumes')
        const volumeUpdates = await lftp(this.getConfig('MDOS_API_URI'), appYaml.tenantName, appYaml.appName, volSourcePath, userInfo.data.lftpCreds)

        // Build / push application
        for (let appComp of appYaml.components) {
            let targetRegistry = null
            if (appComp.registry) {
                targetRegistry = appComp.registry
            } else if (!appComp.publicRegistry) {
                targetRegistry = userInfo.data.registry
            }
            const regCreds = await this.collectRegistryCredentials(flags)
            await buildPushComponent(userInfo.data, regCreds, targetRegistry, appComp, appRootDir, appYaml.tenantName)
        }

        // Do some checks, make sure this deployment will not collide with existing deployments for other apps
        let deployedApps
        try {
            deployedApps = await this.api(`kube?target=applications&clientId=${appYaml.tenantName}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
        

        let errorMsg: string | null = null
        // Make sure deployed apps with same uuid do not have different names
        for (const deployedApp of deployedApps.data) {
            if (!errorMsg && deployedApp.isHelm && appYaml.name == deployedApp.name) {
                for (const deployedComponent of deployedApp.values.components) {
                    if (!errorMsg) {
                        const thisAppCompUuidMatch = appYaml.components.find((thisComp: { uuid: any }) => thisComp.uuid == deployedComponent.uuid)
                        const thisAppCompNameMatch = appYaml.components.find((thisComp: { name: any }) => thisComp.name == deployedComponent.name)

                        // Make sure the app UUID and name have not changed
                        if (thisAppCompUuidMatch && thisAppCompUuidMatch.name != deployedComponent.name) {
                            errorMsg = 'There is already an application deployed with the same UUID, but with a different name.'
                        } else if (thisAppCompNameMatch && thisAppCompNameMatch.uuid != deployedComponent.uuid) {
                            errorMsg = 'There is already an application deployed with the same name, but with a different UUID.'
                        }
                    }
                }
            }
        }
        
        // check that volume names are not already in use by other apps
        // NOTE: Probably obsolete checks. Need error UC to implement right
        // if(!errorMsg) {
        //     let allOtherVolumeNames: any[] = []
        //     for(const deployedApp of deployedApps.data) {
        //         // If other app
        //         if(!errorMsg && deployedApp.isHelm && appYaml.name != deployedApp.name) {
        //             for(const deployedComponent of deployedApp.values.components) {
        //                 if(deployedComponent.volumes) {
        //                     allOtherVolumeNames = [...allOtherVolumeNames, ...deployedComponent.volumes.map((thisVol: { name: any }) => thisVol.name)]
        //                 }
        //             }
        //         }
        //     }
        //     appYaml.components.forEach((thisComp: { volumes: any[] }) => {
        //         if(!errorMsg && thisComp.volumes) {
        //             thisComp.volumes.forEach((thisVol: { name: any }) => {
        //                 if(allOtherVolumeNames.includes(thisVol.name)) {
        //                     errorMsg = `The volume '${thisVol.name}' is already used by an other application in this namespace`
        //                 }
        //             })
        //         }
        //     })
        // }

        if (errorMsg) {
            error(errorMsg)
            process.exit(1)
        }

        // Init realtime connection
        await this.initSocketIo()

        const consoleHandles: any[] = []
        let spinning = false
        let appLogs = {}
        const processId = await this.socketManager.subscribe((data: any) => {
            // Incomming deployment status data
            if (data.raw && data.deployStatus) {
                if (spinning) {
                    CliUx.ux.action.stop('scheduled')
                    spinning = false
                    console.log()
                }
                this.showRealtimeDeploymentDetails(consoleHandles, data.deployStatus)
            }
            // Incomming container logs
            else if (data.raw && data.appLogs) {
                appLogs = data.appLogs
            }
        })

        // Deploy app
        CliUx.ux.action.start('Deploying application')
        spinning = true
        try {
            process.on('SIGINT', () => {
                error('Deployment interrupted')
                this.showAppLogs(appLogs)
                process.exit(1)
            })

            await this.api(`mdos`, 'post', {
                type: 'deploy',
                values: appYamlBase64,
                restart: true,
                processId: processId,
            })
            this.socketManager.unsubscribe()
            success('Application deployed')
        } catch (error) {
            if (!spinning) CliUx.ux.action.stop('error')
            this.showError(error)
            this.showAppLogs(appLogs)
            process.exit(1)
        }
    }

    /**
     * Show details of deployment in realtime
     *
     * @param {any[]} consoleHandles
     * @param {*} deployStatus
     * @memberof Deploy
     */
    showRealtimeDeploymentDetails(consoleHandles: any[], deployStatus: any) {
        const podNames = Object.keys(deployStatus)
        for (const podName of podNames) {
            let logLine

            // Pod head line
            let lineName = `${podName}-head`
            let existingConsole = consoleHandles.find((cObj: { name: string }) => cObj.name == lineName)
            logLine = chalk.blue.bold(`Pod: ${deployStatus[podName].name}`)
            if (!existingConsole) {
                existingConsole = {
                    name: lineName,
                    set: this.getConsoleLineHandel(logLine),
                }
                consoleHandles.push(existingConsole)
            } else {
                existingConsole.set(logLine)
            }

            // Pod phase line

            // Identify if state is an error
            let isPending = false
            if (['Pending'].includes(deployStatus[podName].phase)) isPending = true

            // Identify if state is an error
            let isError = false
            if (['Failed', 'Unknown', 'Error'].includes(deployStatus[podName].phase)) isError = true

            let isSuccess = false
            if (['Running', 'Succeeded'].includes(deployStatus[podName].phase)) isSuccess = true

            // If success, make sure it's not a false success
            let falseSuccess = false
            if (isSuccess) {
                const notReadyInitContainers = deployStatus[podName].initContainerStatuses.find((statusObj: { ready: any }) => !statusObj.ready)
                const notReadyContainers = deployStatus[podName].containerStatuses.find((statusObj: { started: any }) => !statusObj.started)

                if (notReadyInitContainers || notReadyContainers) {
                    falseSuccess = true
                }
            }

            if (deployStatus[podName].phase) {
                lineName = `${podName}-phase`
                existingConsole = consoleHandles.find((cObj: { name: string }) => cObj.name == lineName)
                logLine = `    Phase: ${deployStatus[podName].phase}${isSuccess && falseSuccess ? ' (but not ready)' : ''}`
                if (!existingConsole) {
                    existingConsole = {
                        name: lineName,
                        set: this.getConsoleLineHandel(
                            isError
                                ? chalk.red(logLine)
                                : isSuccess && !falseSuccess
                                ? chalk.green(logLine)
                                : isPending
                                ? chalk.grey(logLine)
                                : chalk.yellow.dim(logLine)
                        ),
                    }
                    consoleHandles.push(existingConsole)
                } else {
                    existingConsole.set(
                        isError
                            ? chalk.red(logLine)
                            : isSuccess && !falseSuccess
                            ? chalk.green(logLine)
                            : isPending
                            ? chalk.grey(logLine)
                            : chalk.yellow.dim(logLine)
                    )
                }
            }

            // Process init containers
            for (let initContainerStatus of deployStatus[podName].initContainerStatuses) {
                // Init container head line
                lineName = `${podName}-${initContainerStatus.name}-head`
                existingConsole = consoleHandles.find((cObj: { name: string }) => cObj.name == lineName)
                let logLine = chalk.bold.grey(`    Init container: ${initContainerStatus.name}`)
                if (!existingConsole) {
                    existingConsole = {
                        name: lineName,
                        set: this.getConsoleLineHandel(logLine),
                    }
                    consoleHandles.push(existingConsole)
                } else {
                    existingConsole.set(logLine)
                }

                // Init container state line
                lineName = `${podName}-${initContainerStatus.name}-state`
                existingConsole = consoleHandles.find((cObj: { name: string }) => cObj.name == lineName)
                logLine = `        State: ${initContainerStatus.state}${initContainerStatus.reason ? ' (' + initContainerStatus.reason + ')' : ''}`
                if (!existingConsole) {
                    existingConsole = {
                        name: lineName,
                        set: this.getConsoleLineHandel(logLine),
                    }
                    consoleHandles.push(existingConsole)
                } else {
                    existingConsole.set(logLine)
                }

                // Init container state line
                lineName = `${podName}-${initContainerStatus.name}-msg`
                existingConsole = consoleHandles.find((cObj: { name: string }) => cObj.name == lineName)
                logLine = `        Details: ${initContainerStatus.message ? initContainerStatus.message : 'n/a'}`

                // Identify if state is an error
                let isError = false
                if (
                    initContainerStatus.state == 'waiting' &&
                    ['ErrImagePull', 'ImagePullBackOff', 'CrashLoopBackOff', 'Error'].includes(
                        initContainerStatus.reason ? initContainerStatus.reason : ''
                    )
                )
                    isError = true

                if (initContainerStatus.state == 'terminated' && ['Error'].includes(initContainerStatus.reason ? initContainerStatus.reason : ''))
                    isError = true

                if (!existingConsole) {
                    existingConsole = {
                        name: lineName,
                        set: this.getConsoleLineHandel(isError ? chalk.red(logLine) : logLine),
                    }
                    consoleHandles.push(existingConsole)
                } else {
                    existingConsole.set(isError ? chalk.red(logLine) : logLine)
                }
            }

            // Process containers
            for (let containerStatus of deployStatus[podName].containerStatuses) {
                // Init container head line
                lineName = `${podName}-${containerStatus.name}-head`
                existingConsole = consoleHandles.find((cObj: { name: string }) => cObj.name == lineName)
                let logLine = chalk.bold.grey(`    Container: ${containerStatus.name}`)
                if (!existingConsole) {
                    existingConsole = {
                        name: lineName,
                        set: this.getConsoleLineHandel(logLine),
                    }
                    consoleHandles.push(existingConsole)
                } else {
                    existingConsole.set(logLine)
                }

                // Container state line
                lineName = `${podName}-${containerStatus.name}-state`
                existingConsole = consoleHandles.find((cObj: { name: string }) => cObj.name == lineName)
                logLine = `        State: ${containerStatus.state}${containerStatus.reason ? ' (' + containerStatus.reason + ')' : ''}`

                // Identify if state is an error
                let isError = false
                if (
                    containerStatus.state == 'waiting' &&
                    ['ErrImagePull', 'ImagePullBackOff', 'CrashLoopBackOff', 'Error'].includes(containerStatus.reason ? containerStatus.reason : '')
                )
                    isError = true

                if (containerStatus.state == 'terminated' && ['Error'].includes(containerStatus.reason ? containerStatus.reason : '')) isError = true

                if (!existingConsole) {
                    existingConsole = {
                        name: lineName,
                        set: this.getConsoleLineHandel(isError ? chalk.red(logLine) : logLine),
                    }
                    consoleHandles.push(existingConsole)
                } else {
                    existingConsole.set(isError ? chalk.red(logLine) : logLine)
                }

                // Init container state line
                lineName = `${podName}-${containerStatus.name}-msg`
                existingConsole = consoleHandles.find((cObj: { name: string }) => cObj.name == lineName)
                logLine = `        Details: ${containerStatus.message ? containerStatus.message : 'n/a'}`
                if (!existingConsole) {
                    existingConsole = {
                        name: lineName,
                        set: this.getConsoleLineHandel(logLine),
                    }
                    consoleHandles.push(existingConsole)
                } else {
                    existingConsole.set(logLine)
                }
            }
        }
    }

    
    /**
     * Print application logs on error or interrupt
     *
     * @param {*} logs
     * @memberof Deploy
     */
    showAppLogs(logs: any) {
        const logKeys = Object.keys(logs)
        if (logs && logKeys.length > 0) {
            console.log()
            console.log(chalk.yellow.dim('Application logs:'))
            logKeys.forEach((containerRefString, index) => {
                if (index > 0) {
                    console.log()
                    console.log('---')
                }
                console.log()
                const containerRefArray = containerRefString.split('::')
                console.log(chalk.cyan('Component:'), containerRefArray[1])
                console.log(chalk.cyan('Container:'), containerRefArray[2])
                console.log(chalk.cyan('Logs:     '), chalk.grey(logs[containerRefString].split('\n').join('\n           ')))
                console.log()
            })
        }
    }

    
    /**
     * Get the user registry credentials to push to the mdos registry
     *
     * @return {*} 
     * @memberof Deploy
     */
    async collectRegistryCredentials(flags: { username: string | undefined; password: string | undefined }) {
        if (!this.regCreds) {
            context('To push your images to the mdos registry, you need to provide your mdos username and password first')


            const questions = []
            if(!flags.username) {
                questions.push({
                    group: 'application',
                    type: 'text',
                    name: 'username',
                    message: 'Username:',
                    validate: (value: { trim: () => { (): any; new (): any; length: number } }) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        return true
                    },
                })
            }
            if(!flags.password) {
                questions.push({
                    group: 'application',
                    type: 'text',
                    name: 'password',
                    message: 'Password:',
                    validate: (value: { trim: () => { (): any; new (): any; length: number } }) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        return true
                    },
                })
            }
            let responses = {}
            if(questions.length > 0) {
                responses = await inquirer.prompt(questions)
            }
            this.regCreds = {...flags, ...responses}
        }
        return this.regCreds
    }
}
