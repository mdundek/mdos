import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class Delete extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		clientId: Flags.string({ char: 'c', description: 'Keycloak client ID to remove' }),
        force: Flags.boolean({ char: 'f', description: 'Do not ask for comfirmation' }),
	}
	// ***** QUESTIONS *****
    static questions = []
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
            // Get existing clients
            let respClients: { data: any[] }
            try {
                respClients = await this.api(`keycloak?target=clients&realm=mdos`, "get")
            } catch (error) {
                this.showError(error);
                process.exit(1);
            }

			// Collect target client
            let clientResponse: { clientUuid: any; clientId: any }
            if(flags.clientId) {
                const targetClient = respClients.data.find(c => c.clientId == flags.clientId)
                if(!targetClient) {
                    error("Client not found");
                    process.exit(1);
                }
                clientResponse = {
                    clientUuid: targetClient.id,
                    clientId: flags.clientId
                }
            } else {
                clientResponse = await inquirer.prompt([{
                    name: 'clientId',
                    message: 'Select a client from which to remove a role from',
                    type: 'list',
                    choices: respClients.data.map((o) => {
                        return { name: o.clientId, value: o.clientId }
                    }),
                }])
                clientResponse.clientUuid = respClients.data.find(c => c.clientId == clientResponse.clientId).id;
            }

            // Confirm?
            let confirmed = false
            if(flags.force) {
                confirmed = true
            } else {
                const confirmResponse = await inquirer.prompt([{
                    name: 'confirm',
                    message: 'You are about to delete a OIDC provider, are you sure you wish to prosceed?',
                    type: 'confirm',
                    default: false
                }])
                confirmed = confirmResponse.confirm
            }
            
            if(confirmed) {
                CliUx.ux.action.start('Deleting Keycloak client')
                try {
                    await this.api(`keycloak/${clientResponse.clientUuid}?target=clients&realm=mdos`, 'delete')
                    CliUx.ux.action.stop()
                } catch (error) {
                    CliUx.ux.action.stop('error')
                    this.showError(error);
                    process.exit(1);
                }
            }
		} else {
			warn("Keycloak is not installed");
			process.exit(1);
		}
	}
}
