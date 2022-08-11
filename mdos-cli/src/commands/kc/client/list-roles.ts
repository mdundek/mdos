import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class ListRoles extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		clientId: Flags.string({ char: 'c', description: 'Keycloak aclient ID' }),
	}
	// ***** QUESTIONS *****
    static questions = [
        {
			group: "kc_client_groups",
			type: 'text',
			name: 'clientId',
			message: 'Enter a Keycloak client ID (application)?',
			validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true)
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
		
		let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            this.showError(err);
			process.exit(1);
        }

        if (nsResponse.data.find((ns: { metadata: { name: string } }) => ns.metadata.name == 'keycloak')) {
            let q = filterQuestions(ListRoles.questions, "kc_client_groups", flags);
            let responses = q.length > 0 ? await inquirer.prompt(q) : {}

            try {
                const response = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=${flags.clientId ? flags.clientId : responses.clientId}`, "get")

                console.log();
                CliUx.ux.table(response.data, {
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
                this.showError(error);
                process.exit(1);
            }
		} else {
			warn("Keycloak is not installed");
			process.exit(1);
		}
	}
}
