import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class RemoveRole extends Command {
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
		const { flags } = await this.parse(RemoveRole)
		
		let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            error("Mdos API server is unavailable");
			process.exit(1);
        }

        if (nsResponse.data.find((ns: { metadata: { name: string } }) => ns.metadata.name == 'keycloak')) {
            let q = filterQuestions(RemoveRole.questions, "<group>", flags);
            let responses = q.length > 0 ? await inquirer.prompt(q) : {}

		} else {
			warn("Keycloak is not installed");
			process.exit(1);
		}
	}
}
