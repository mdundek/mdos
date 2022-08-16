import { Flags, CliUx } from '@oclif/core'
import Command from '../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions, s3sync } = require('../lib/tools')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

export default class Deploy extends Command {
    static description = 'describe the command here'

    static flags = {}

    public async run(): Promise<void> {
        const { flags } = await this.parse(Deploy)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

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

        // Sync folders if any
        // 1. Call backend to authenticate user and get minio credentials for tenantName (user must have roles "<tenantName>" && "minio-mirror" in Keycloak. If token missing or invalid, open URL to authenticate first)
        //    INFO: There are tenant wide minio credentials, mapping to s3://<tenantNmae>/* with read/write access rights. Those credentials can be found in the <tenantName> namespace in a secret
        // 2. Do sync using those tenantName specific credentials




        const userInfo = await this.api("mdos/user-info", "GET")
        console.log(userInfo);



        // await s3sync('/home/mdundek/workspaces/mdos_playgroound/myapp/frontend/syncdir', 'mybucket');

        // CliUx.ux.action.start('Deploying application')
        // try {
        //     await this.api(`mdos`, 'post', {
        //         type: 'deploy',
        //         values: appYamlBase64
        //     })
        //     CliUx.ux.action.stop()
        // } catch (error) {
        //     CliUx.ux.action.stop('error')
        //     this.showError(error);
        //     process.exit(1);
        // }
    }
}
