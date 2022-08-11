import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class List extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		// username: Flags.string({ char: 'u', description: 'Keycloak admin username' }),
	}
	// ***** QUESTIONS *****
    static questions = [
        // {
        //     group: "<group>",
        //     type: 'text',
        //     name: 'username',
        //     message: 'What admin username would you like to configure for Keycloak?',
        //     validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        // }
    ]
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(List)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        await this.validateJwt();

		try {
            const resp = await this.api(`oidc-provider`, "get")
          
            console.log();
            CliUx.ux.table(resp.data, {
                clientId: {
                    header: 'NAME',
                    minWidth: 20,
                    get: row => row.name
                }
            }, {
                printLine: this.log.bind(this)
            })
            console.log();
        } catch (error) {
            console.log(error);
        }
	}
}
