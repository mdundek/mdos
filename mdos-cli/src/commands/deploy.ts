import { Flags, CliUx } from '@oclif/core'
import Command from '../base'

const inquirer = require('inquirer')
const { info, context, error, s3sync, isDockerInstalled, buildPushComponent } = require('../lib/tools')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

export default class Deploy extends Command {
    static description = 'describe the command here'

    static flags = {}

    public async run(): Promise<void> {
        const { flags } = await this.parse(Deploy)

        // Make sure docker is installed
        const dockerInstalled = await isDockerInstalled();
        if(!dockerInstalled) {
            error("To build images, you need to install Docker first:", false, true)
            context("https://docs.docker.com/engine/install/", true, false);
            process.exit(1);
        }

        // Detect mdos project yaml file
        let appYamlPath = path.join(process.cwd(), "mdos.yaml")
        let appRootDir = process.cwd()
        if (!fs.existsSync(appYamlPath)) {
            appYamlPath = path.join(path.dirname(process.cwd()), "mdos.yaml")
            if (!fs.existsSync(appYamlPath)) {
                error("You don't seem to be in a mdos project folder")
                process.exit(1)
            }
            appRootDir = path.dirname(process.cwd())
        }

        // Load mdos yaml file
        let appYamlBase64
        let appYaml: { components: any; registry: any; tenantName: any }
        try {
            const yamlString = fs.readFileSync(appYamlPath, 'utf8')
            appYaml = YAML.parse(yamlString)
            appYamlBase64 = Buffer.from(yamlString, 'utf-8').toString('base64')
        } catch (error) {
            this.showError(error)
            process.exit(1);
        }
        
        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Get credentials for minio for user
        let userInfo
        try {
            userInfo = await this.api("mdos/user-info", "GET")
        } catch (err) {
            this.showError(err);
            process.exit(1);
        }

         // Build / push application
        for(let appComp of appYaml.components) {
            let targetRegistry = null;
            if(appComp.registry) {
                targetRegistry = appComp.registry;
            }
            else if(!appComp.publicRegistry) {
                targetRegistry = userInfo.data.registry;
            }
         
            await buildPushComponent(userInfo.data, targetRegistry, appComp, appRootDir);
        }

	    // Sync minio content for volumes
        const targetS3Creds = userInfo.data.s3.find((b: { bucket: any }) => b.bucket == appYaml.tenantName);
        let volumeUpdates = false
        for(let component of appYaml.components) {
            if(component.volumes) {
                for(let volume of component.volumes) {
                    if(volume.syncVolume) {
                        if(!targetS3Creds) {
                            error("There are no available S3 credentials allowing you to sync your volumes");
                            process.exit(1);
                        } else if(targetS3Creds.permissions == "read") {
                            error("You do not have sufficient S3 credentials allowing you to sync your volumes");
                            process.exit(1);
                        }

                        let volSourcePath = path.join(appRootDir, "volumes", volume.name)

                        let volHasUpdates = await s3sync(userInfo.data.S3Provider, targetS3Creds.bucket, volume.name, volSourcePath, targetS3Creds)
                        if(volHasUpdates) volumeUpdates = true
                    }
                }
            }
        }

        // Init realtime connection
        await this.initSocketIo();

        const consoleHandles: any[] = [];
        let spinning = false
        const processId = await this.socketManager.subscribe((data: any) => {
            if(data.raw && data.deployStatus) {
                if(spinning) {
                    CliUx.ux.action.stop("scheduled")
                    spinning = false
                    console.log()
                }

                const podNames = Object.keys(data.deployStatus);
                for(const podName of podNames) {
                    let logLine;

                    // Pod head line
                    let lineName = `${podName}-head`
                    let existingConsole = consoleHandles.find(cObj => cObj.name == lineName);
                    logLine = chalk.blue.bold(`Pod: ${data.deployStatus[podName].name}`)
                    if(!existingConsole) {
                        existingConsole = {
                            name: lineName,
                            set: this.getConsoleLineHandel(logLine)
                        }
                        consoleHandles.push(existingConsole)
                    } else {
                        existingConsole.set(logLine);
                    }
                    
                    // Pod phase line

                    // Identify if state is an error
                    let isPending = false
                    if([
                        "Pending"
                    ].includes(data.deployStatus[podName].phase))
                        isPending = true

                    // Identify if state is an error
                    let isError = false
                    if([
                        "Failed", 
                        "Unknown",
                        "Error"
                    ].includes(data.deployStatus[podName].phase))
                        isError = true
                    
                    let isSuccess = false
                    if([
                        "Running", 
                        "Succeeded"
                    ].includes(data.deployStatus[podName].phase))
                        isSuccess = true

                    // If success, make sure it's not a false success
                    let falseSuccess = false
                    if(isSuccess) {
                        const notReadyInitContainers = data.deployStatus[podName].initContainerStatuses.find((statusObj: { ready: any }) => !statusObj.ready)
                        const notReadyContainers = data.deployStatus[podName].containerStatuses.find((statusObj: { started: any }) => !statusObj.started)

                        if(notReadyInitContainers || notReadyContainers) {
                            falseSuccess = true
                        }
                    }
                
                    if(data.deployStatus[podName].phase) {
                        lineName = `${podName}-phase`
                        existingConsole = consoleHandles.find(cObj => cObj.name == lineName);
                        logLine = `    Phase: ${data.deployStatus[podName].phase}${isSuccess && falseSuccess ? " (but not ready)":""}`
                        if(!existingConsole) {
                            existingConsole = {
                                name: lineName,
                                set: this.getConsoleLineHandel(isError ? chalk.red(logLine) : isSuccess && !falseSuccess ? chalk.green(logLine) : isPending ? chalk.grey(logLine) : chalk.yellow.dim(logLine))
                            }
                            consoleHandles.push(existingConsole)
                        } else {
                            existingConsole.set(isError ? chalk.red(logLine) : isSuccess && !falseSuccess ? chalk.green(logLine) : isPending ? chalk.grey(logLine) : chalk.yellow.dim(logLine));
                        }
                    }

                    // Process init containers
                    for(let initContainerStatus of data.deployStatus[podName].initContainerStatuses) {
                        // Init container head line
                        lineName = `${podName}-${initContainerStatus.name}-head`
                        existingConsole = consoleHandles.find(cObj => cObj.name == lineName)
                        let logLine = chalk.bold.grey(`    Init container: ${initContainerStatus.name}`)
                        if(!existingConsole) {
                            existingConsole = {
                                name: lineName,
                                set: this.getConsoleLineHandel(logLine)
                            }
                            consoleHandles.push(existingConsole)
                        } else {
                            existingConsole.set(logLine);
                        }

                        // Init container state line
                        lineName = `${podName}-${initContainerStatus.name}-state`
                        existingConsole = consoleHandles.find(cObj => cObj.name == lineName)
                        logLine = `        State: ${initContainerStatus.state}${initContainerStatus.reason ? " (" + initContainerStatus.reason + ")" : ""}`
                        if(!existingConsole) {
                            existingConsole = {
                                name: lineName,
                                set: this.getConsoleLineHandel(logLine)
                            }
                            consoleHandles.push(existingConsole)
                        } else {
                            existingConsole.set(logLine);
                        }

                        // Init container state line
                        lineName = `${podName}-${initContainerStatus.name}-msg`
                        existingConsole = consoleHandles.find(cObj => cObj.name == lineName)
                        logLine = `        Details: ${initContainerStatus.message ? initContainerStatus.message : "n/a"}`

                        // Identify if state is an error
                        let isError = false
                        if(initContainerStatus.state == "waiting" && [
                            "ErrImagePull", 
                            "ImagePullBackOff",
                            "CrashLoopBackOff",
                            "Error"
                        ].includes(initContainerStatus.reason ? initContainerStatus.reason : ""))
                            isError = true

                        if(initContainerStatus.state == "terminated" && [
                            "Error"
                        ].includes(initContainerStatus.reason ? initContainerStatus.reason : ""))
                            isError = true

                        if(!existingConsole) {
                            existingConsole = {
                                name: lineName,
                                set: this.getConsoleLineHandel(isError ? chalk.red(logLine) : logLine)
                            }
                            consoleHandles.push(existingConsole)
                        } else {
                            existingConsole.set(isError ? chalk.red(logLine) : logLine);
                        }
                    }

                    // Process containers
                    for(let containerStatus of data.deployStatus[podName].containerStatuses) {
                        // Init container head line
                        lineName = `${podName}-${containerStatus.name}-head`
                        existingConsole = consoleHandles.find(cObj => cObj.name == lineName)
                        let logLine = chalk.bold.grey(`    Container: ${containerStatus.name}`)
                        if(!existingConsole) {
                            existingConsole = {
                                name: lineName,
                                set: this.getConsoleLineHandel(logLine)
                            }
                            consoleHandles.push(existingConsole)
                        } else {
                            existingConsole.set(logLine);
                        }

                        // Container state line
                        lineName = `${podName}-${containerStatus.name}-state`
                        existingConsole = consoleHandles.find(cObj => cObj.name == lineName)
                        logLine = `        State: ${containerStatus.state}${containerStatus.reason ? " (" + containerStatus.reason + ")" : ""}`
                        
                        // Identify if state is an error
                        let isError = false
                        if(containerStatus.state == "waiting" && [
                            "ErrImagePull", 
                            "ImagePullBackOff",
                            "CrashLoopBackOff",
                            "Error"
                        ].includes(containerStatus.reason ? containerStatus.reason : ""))
                            isError = true

                        if(containerStatus.state == "terminated" && [
                            "Error"
                        ].includes(containerStatus.reason ? containerStatus.reason : ""))
                            isError = true

                        if(!existingConsole) {
                            existingConsole = {
                                name: lineName,
                                set: this.getConsoleLineHandel(isError ? chalk.red(logLine) : logLine)
                            }
                            consoleHandles.push(existingConsole)
                        } else {
                            existingConsole.set(isError ? chalk.red(logLine) : logLine);
                        }
                    
                        // Init container state line
                        lineName = `${podName}-${containerStatus.name}-msg`
                        existingConsole = consoleHandles.find(cObj => cObj.name == lineName)
                        logLine = `        Details: ${containerStatus.message ? containerStatus.message : "n/a"}`
                        if(!existingConsole) {
                            existingConsole = {
                                name: lineName,
                                set: this.getConsoleLineHandel(logLine)
                            }
                            consoleHandles.push(existingConsole)
                        } else {
                            existingConsole.set(logLine)
                        }
                    }
                }
            }
        });

        // Deploy app
        CliUx.ux.action.start('Deploying application')
        spinning = true
        try {
            await this.api(`mdos`, 'post', {
                type: 'deploy',
                values: appYamlBase64,
                restart: true,
                processId: processId
            })
            this.socketManager.unsubscribe()
        } catch (error) {
            if(!spinning)
                CliUx.ux.action.stop('error')
            this.showError(error)
            process.exit(1)
        }
    }
}
