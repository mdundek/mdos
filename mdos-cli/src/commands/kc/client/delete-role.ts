import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class DeleteRole extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		clientId: Flags.string({ char: 'c', description: 'Keycloak client ID' }),
        role: Flags.string({ char: 'r', description: 'Client role to delete' }),
	}
	// ***** QUESTIONS *****
    static questions = []
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(DeleteRole)

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
                    message: 'select a client from which to remove a role from',
                    type: 'list',
                    choices: respClients.data.map((o) => {
                        return { name: o.clientId, value: o.clientId }
                    }),
                }])
                clientResponse.clientUuid = respClients.data.find(c => c.clientId == clientResponse.clientId).id;
            }

            // Get all Client roles
            let respClientRoles;
            try {
                respClientRoles = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=${clientResponse.clientId}`, "get")
            } catch (error) {
                this.showError(error);
                process.exit(1);
            }
            if(respClientRoles.data.length == 0) {
                error("There are no roles asssociated to this client");
                process.exit(1);
            }

            // Collect client role
            let targetRole
            if(flags.role) {
                targetRole = respClientRoles.data.find((r: { name: string | undefined }) => r.name == flags.role)
                if(!targetRole) {
                    error("Client role not found");
                    process.exit(1);
                }
            } else {
                const roleResponse = await inquirer.prompt([{
                    name: 'role',
                    message: 'select a role to delete from this client',
                    type: 'list',
                    choices: respClientRoles.data.map((o: { name: any }) => {
                        return { name: o.name, value: o }
                    }),
                }])
                targetRole = roleResponse.role
            }

            CliUx.ux.action.start('Deleting Keycloak client role')
            try {
                await this.api(`keycloak/${targetRole.name}?target=client-roles&realm=mdos&clientUuid=${clientResponse.clientUuid}`, 'delete')
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
                this.showError(error);
                process.exit(1);
            }

		} else {
			warn("Keycloak is not installed");
			process.exit(1);
		}
	}
}
