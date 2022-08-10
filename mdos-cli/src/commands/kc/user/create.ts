import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions, mergeFlags } = require('../../../lib/tools')
const chalk = require('chalk')

export default class Create extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		username: Flags.string({ char: 'u', description: 'Keycloak username' }),
        password: Flags.string({ char: 'p', description: 'Keycloak password' }),
        email: Flags.string({ char: 'e', description: 'Keycloak user email' })
	}
	// ***** QUESTIONS *****
    static questions = [
        {
            group: "user",
            type: 'text',
            name: 'username',
            message: 'Enter keycloak username',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        },
        {
            group: "user",
            type: 'text',
            name: 'password',
            message: 'Enter keycloak password',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        },
        {
            group: "user",
            type: 'text',
            name: 'email',
            message: 'Enter keycloak user email address',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        }
    ]
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(Create)
		
		let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get', false)
        } catch (err) {
            error("Mdos API server is unavailable");
			process.exit(1);
        }

        if (nsResponse.data.find((ns: { metadata: { name: string } }) => ns.metadata.name == 'keycloak')) {
            let q = filterQuestions(Create.questions, "user", flags);
            let responses = q.length > 0 ? await inquirer.prompt(q) : {}

            CliUx.ux.action.start('Creating Keycloak user')
            try {
                await this.api(`keycloak`, 'post', true, {
                    type: 'user',
                    realm: 'mdos',
                    ...mergeFlags(responses, flags),
                })
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
                process.exit(1);
            }
		} else {
			warn("Keycloak is not installed");
			process.exit(1);
		}
	}
}
