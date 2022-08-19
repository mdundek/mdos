import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../lib/tools')
const chalk = require('chalk')

export default class Delete extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		namespace: Flags.string({ char: 'n', description: 'Namespace to remove' }),
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
		
        // Get existing clients
        let respClients: { data: any[] }
        try {
            respClients = await this.api(`keycloak?target=clients&realm=mdos`, "get")
        } catch (error) {
            this.showError(error);
            process.exit(1);
        }

        if(respClients.data.length == 0) {
            error("No namespaces found");
            process.exit(1);
        }

        // Collect target client
        let clientResponse: { clientUuid: any; clientId: any, namespace: string }
        if(flags.namespace) {
            const targetClient = respClients.data.find(c => c.clientId == flags.namespace)
            if(!targetClient) {
                error("Keycloak client not found for this namespace");
                process.exit(1);
            }
            clientResponse = {
                clientUuid: targetClient.id,
                clientId: flags.namespace,
                namespace: flags.namespace
            }
        } else {
            clientResponse = await inquirer.prompt([{
                name: 'clientId',
                message: 'Select a namespace to delete',
                type: 'list',
                choices: respClients.data.map((o) => {
                    return { name: o.clientId, value: o.clientId }
                }),
            }])
            clientResponse.clientUuid = respClients.data.find(c => c.clientId == clientResponse.clientId).id
            clientResponse.namespace = clientResponse.clientId
        }

        // Confirm?
        let confirmed = false
        if(flags.force) {
            confirmed = true
        } else {
            const confirmResponse = await inquirer.prompt([{
                name: 'confirm',
                message: 'You are about to delete a Namespace from your cluster?',
                type: 'confirm',
                default: false
            }])
            confirmed = confirmResponse.confirm
        }
        
        if(confirmed) {
            CliUx.ux.action.start('Deleting Keycloak client')
            try {
                await this.api(`kube/${clientResponse.namespace}?target=tenantNamespace&realm=mdos&clientUuid=${clientResponse.clientUuid}`, 'delete')
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
                this.showError(error);
                process.exit(1);
            }
        }
	}
}
