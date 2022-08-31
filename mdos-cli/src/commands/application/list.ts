import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'

const inquirer = require('inquirer')
const { info, success, context, error, s3sync, isDockerInstalled, buildPushComponent } = require('../../lib/tools')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

export default class List extends Command {
    static description = 'describe the command here'

    static flags = {
        clientId: Flags.string({ char: 'c', description: 'Keycloak clientId to look for applications for?' }),
    }

    public async run(): Promise<void> {
        const { flags } = await this.parse(List)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Get client id & uuid
        let clientResponse;
        try {
            clientResponse = await this.collectClientId(flags, 'What client do you want to list applications for');
        } catch (error) {
            this.showError(error);
            process.exit(1);
        }

        // List apps
        try {
            const response = await this.api(`kube?target=applications&clientId=${clientResponse.clientId}`, 'get')

            console.log();
            CliUx.ux.table(response.data, {
                appName: {
                    header: 'NAME',
                    minWidth: 20,
                    get: row => row.name
                },
                helmManaged: {
                    header: 'IS COMPOSITE APP',
                    minWidth: 20,
                    get: row => row.isHelm ? "Yes" : "No"
                }
            }, {
                printLine: this.log.bind(this)
            })
            console.log();
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error)
            process.exit(1)
        }
    }
}
