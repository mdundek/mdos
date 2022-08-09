import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions, mergeFlags } = require('../../../lib/tools')
const chalk = require('chalk')

export default class CreateRole extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		clientId: Flags.string({ char: 'c', description: 'Keycloak client ID' }),
        name: Flags.string({ char: 'n', description: 'Keycloak clientrole name' }),
	}
	// ***** QUESTIONS *****
    static questions = []
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(CreateRole)
		
		let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            error("Mdos API server is unavailable");
			process.exit(1);
        }

        if (nsResponse.data.find((ns: { metadata: { name: string } }) => ns.metadata.name == 'keycloak')) {
            try {
                // Get all realm Clients
                const clientResponse = await this.api("keycloak?target=clients&realm=mdos", "get");
                if(clientResponse.data.length == 0) {
                    error("There are no clients yet available. Create a client first using the command:");
                    console.log("   mdos kc client create");
                    process.exit(1);
                }

                // Select target client
                let clientResponses: { clientUuid: any };
                if(flags.clientId) {
                    const targetClient = clientResponse.data.find((o: { clientId: string }) => o.clientId == flags.clientId)
                    if(!targetClient) {
                        error("Could not find client ID: " + flags.clientId);
                        process.exit(1);
                    }
                    clientResponses = {clientUuid: targetClient.id};
                } else {
                    clientResponses = await inquirer.prompt([{
                        name: 'clientUuid',
                        message: 'select a Client ID to create a Role for',
                        type: 'list',
                        choices: clientResponse.data.map((o: { clientId: any; id: any }) => {
                            return { name: o.clientId, value: o.id }
                        }),
                    }])
                }
                
                // Get existing roles for this client
                const respClientRoles = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=${clientResponse.data.find((o: { id: any }) => o.id == clientResponses.clientUuid).clientId}`, "get")

                // Collect / check user role name
                let roleResponses;
                if(flags.name) {
                    if( flags.name.trim().length == 0) {
                        error("Name flag can not be empty");
                        process.exit(1);
                    } else if(respClientRoles.data.find((o: { name: string }) => o.name.toLowerCase() == (flags.name || "").trim().toLowerCase())) {
                        error("Client role already exists");
                        process.exit(1);
                    }
                    roleResponses = {
                        name: flags.name
                    }
                } else {
                    roleResponses = await inquirer.prompt([{
                        type: 'text',
                        name: 'name',
                        message: 'Enter the client role name to create',
                        validate: (value: { trim: () => { (): any; new(): any; length: number; toLowerCase: { (): any; new(): any } } }) => {
                            if( value.trim().length == 0) {
                                return "Mandatory field";
                            } else if(respClientRoles.data.find((o: { name: string }) => o.name.toLowerCase() == value.trim().toLowerCase())) {
                                return "Role already exists";
                            }
                            return true
                        },
                    }])
                }
                
                // Create client role
                CliUx.ux.action.start('Creating Keycloak client role')
                try {
                    await this.api(`keycloak`, 'post', {
                        type: 'client-role',
                        realm: 'mdos',
                        ...mergeFlags({
                                ...roleResponses, 
                                ...clientResponses, 
                                clientId: clientResponse.data.find((o: { id: any }) => o.id == clientResponses.clientUuid).clientId
                            }, flags),
                    })
                    CliUx.ux.action.stop()
                } catch (error) {
                    CliUx.ux.action.stop('error')
                    process.exit(1);
                }
            } catch (error) {
                console.log(error);
            }
		} else {
			warn("Keycloak is not installed");
			process.exit(1);
		}
	}
}
