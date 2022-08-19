import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class ListRoles extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		username: Flags.string({ char: 'u', description: 'Keycloak username to get roles for' }),
	}
	// ***** QUESTIONS *****
    static questions = [
        {
            group: "user",
            type: 'text',
            name: 'username',
            message: 'What username do you wish to get the roles for?',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        }
    ]
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(ListRoles)
		
        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt();
        } catch (error) {
            this.showError(error);
			process.exit(1);
        }
        
        let q = filterQuestions(ListRoles.questions, "user", flags);
        let responses = q.length > 0 ? await inquirer.prompt(q) : {}

        let resp;
        try {
            resp = await this.api(`keycloak?target=user-roles&realm=mdos&username=${flags.username ? flags.username : responses.username}`, "get")
        } catch (error) {
            this.showError(error);
            process.exit(1);
        }

        console.log();
        CliUx.ux.table(resp.data, {
            clientId: {
                header: 'CLIENT',
                minWidth: 20,
                get: row => row.client
            },
            realm: {
                header: 'ROLE NAME',
                minWidth: 20,
                get: row => row.name
            }
        }, {
            printLine: this.log.bind(this)
        })
        console.log();
	}
}
