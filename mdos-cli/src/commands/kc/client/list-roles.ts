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
		
        try {
            // Get client id & uuid
            const clientResponse = await this.collectClientId(flags);

            const response = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=${flags.clientId ? flags.clientId : clientResponse.clientId}`, "get")

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
	}
}
