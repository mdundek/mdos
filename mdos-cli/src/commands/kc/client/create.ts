import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions, mergeFlags } = require('../../../lib/tools')
const chalk = require('chalk')

export default class Create extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		clientId: Flags.string({ char: 'c', description: 'Keycloak client ID' }),
	}
	// ***** QUESTIONS *****
    static questions = [
        {
            group: "client",
            type: 'text',
            name: 'clientId',
            message: 'Enter an ID name for this client',
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
            let q = filterQuestions(Create.questions, "client", flags);
            let responses = q.length > 0 ? await inquirer.prompt(q) : {}

            CliUx.ux.action.start('Creating Keycloak client')
            try {
                await this.api(`keycloak`, 'post', true, {
                    type: 'client',
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
