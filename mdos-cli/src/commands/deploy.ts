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

        // Deploy app
        CliUx.ux.action.start('Deploying application')
        try {
            await this.api(`mdos`, 'post', {
                type: 'deploy',
                values: appYamlBase64,
                restart: volumeUpdates
            })
            CliUx.ux.action.stop()
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error);
            process.exit(1);
        }
    }
}
