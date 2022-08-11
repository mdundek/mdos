import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions, mergeFlags } = require('../../../lib/tools')
const chalk = require('chalk')

export default class Add extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		target: Flags.string({ char: 't', description: 'OIDC target' }),
		clienId: Flags.string({ description: 'Keycloak client id name' })
	}
	// ***** QUESTIONS *****
    static questions = [
		{
			group: "oidc",
			type: 'list',
			name: 'target',
			message: 'What OIDC target do you want to add to the platform?',
			choices: ['Keycloak client', 'Google'],
			filter(val: string) {
			  return val.toLowerCase();
			},
		},
        {
			group: "kc_oidc",
			type: 'text',
			name: 'clientId',
			message: 'Enter a Keycloak client ID (application)?',
			validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true)
		}
    ]
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(Add)

		// Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt();
        } catch (error) {
            this.showError(error);
			process.exit(1);
        }

		let q = filterQuestions(Add.questions, "oidc", flags);
        const oidcResponses = q.length > 0 ? await inquirer.prompt(q) : {}

		if(oidcResponses.target == "keycloak client") {
			q = filterQuestions(Add.questions, "kc_oidc", flags);
            let responses = q.length > 0 ? await inquirer.prompt(q) : {}

			// Create new client in Keycloak
			CliUx.ux.action.start('Creating Keycloak client & OIDC provider')
			try {
				await this.api(`oidc-provider`, "post", {
					"type": "keycloak",
					"realm": "mdos",
					"data": {
						...mergeFlags(responses, flags),
						"name": `kc-${responses.clientId}`
					}
				});
				CliUx.ux.action.stop()
			} catch (error) {
				CliUx.ux.action.stop('error')
				this.showError(error);
				process.exit(1);
			}
		} else {
			warn("OIDC provider not implemented yet");
			process.exit(1);
		}
	}
}
