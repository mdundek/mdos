import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class Delete extends Command {
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
		const { flags } = await this.parse(Delete)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt();
        } catch (error) {
            this.showError(error);
			process.exit(1);
        }
		
		let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            this.showError(err);
			process.exit(1);
        }

        if (nsResponse.data.find((ns: { metadata: { name: string } }) => ns.metadata.name == 'keycloak')) {
            let q = filterQuestions(Delete.questions, "<group>", flags);
            let responses = q.length > 0 ? await inquirer.prompt(q) : {}

		} else {
			warn("Keycloak is not installed");
			process.exit(1);
		}
	}
}
