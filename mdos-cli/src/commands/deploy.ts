import { Flags, CliUx } from '@oclif/core'
import Command from '../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions, s3sync, extractErrorMessage } = require('../lib/tools')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

export default class Deploy extends Command {
    static description = 'describe the command here'

    static flags = {}

    public async run(): Promise<void> {
        const { flags } = await this.parse(Deploy)

        // Detect mdos project yaml file
        let appYamlPath = path.join(process.cwd(), "mdos.yaml")
        if (!fs.existsSync(appYamlPath)) {
            appYamlPath = path.join(path.dirname(process.cwd()), "mdos.yaml")
            if (!fs.existsSync(appYamlPath)) {
                error("You don't seem to be in a mdos project folder")
                process.exit(1)
            }
        }

        // Load mdos yaml file
        let appYamlBase64
        let appYaml
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
            error(extractErrorMessage(err));
            process.exit(1);
        }

        // Sync minio content for volumes
        let volumeUpdates = false
        for(let component of appYaml.components) {
            if(component.volumes) {
                for(let volume of component.volumes) {
                    if(volume.syncVolume) {
                        let appYamlPath = path.join(process.cwd(), component.name, volume.name)
                        let volHasUpdates = await s3sync(appYaml.tenantName, volume.bucket, appYamlPath, userInfo.data);
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
