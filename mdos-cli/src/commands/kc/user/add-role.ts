import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class AddRole extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		username: Flags.string({ char: 'u', description: 'Keycloak username to add role for' }),
        clientId: Flags.string({ char: 'c', description: 'Keycloak clientId of the user' }),
        role: Flags.string({ char: 'r', description: 'Keycloak role name to add to this user' }),
	}
	// ***** QUESTIONS *****
    static questions = [
        {
            group: "user",
            type: 'text',
            name: 'username',
            message: 'What username do you wish to add a cliet role for?',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        }
    ]
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(AddRole)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        await this.validateJwt();
		
		let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            error("Mdos API server is unavailable");
			process.exit(1);
        }

        if (nsResponse.data.find((ns: { metadata: { name: string } }) => ns.metadata.name == 'keycloak')) {

            // Get all realm Clients
            const clientResponse = await this.api("keycloak?target=clients&realm=mdos", "get");
            if(clientResponse.data.length == 0) {
                error("There are no clients yet available. Create a client first using the command:");
                console.log("   mdos kc client create");
                process.exit(1);
            }

            // Compute target client
            let clientResponses: { clientUuid: any; clientName?: any };
            if(flags.clientId) {
                const targetClient = clientResponse.data.find((o: { clientId: string }) => o.clientId == flags.clientId)
                if(!targetClient) {
                    error("Could not find client ID: " + flags.clientId);
                    process.exit(1);
                }
                clientResponses = {clientUuid: targetClient.id, clientName: targetClient.clientId};
            } else {
                clientResponses = await inquirer.prompt([{
                    name: 'clientUuid',
                    message: 'select a Client ID to create a Role for',
                    type: 'list',
                    choices: clientResponse.data.map((o: { clientId: any; id: any }) => {
                        return { name: o.clientId, value: o.id }
                    }),
                }])
                const targetClient = clientResponse.data.find((o: { id: any }) => o.id == clientResponses.clientUuid)
                clientResponses.clientName = targetClient.clientId
            }

            // Get all Client roles
            const respClientRoles = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=${clientResponse.data.find((o: { id: any }) => o.id == clientResponses.clientUuid).clientId}`, "get")
            if(respClientRoles.data.length == 0) {
                error("There are no roles asssociated to this client yet. Create a client role first using the command:");
                console.log("   mdos kc client create-role");
                process.exit(1);
            }

            // Compute target client role
            let roleResponses: { roleName: any; roleUuid: any };
            if(flags.role) {
                const targetRole = respClientRoles.data.find((o: { name: string | undefined; clientRole: boolean }) => o.name == flags.role && o.clientRole == true)
                if(!targetRole) {
                    error("Could not find role: " + flags.role);
                    process.exit(1);
                }
                roleResponses = {roleUuid: targetRole.id, roleName: targetRole.name};
            } else {
                roleResponses = await inquirer.prompt([{
                    name: 'roleUuid',
                    message: 'select a role to add from this client',
                    type: 'list',
                    choices: respClientRoles.data.map((o: { name: any; id: any }) => {
                        return { name: o.name, value: o.id }
                    }),
                }])
                roleResponses.roleName = respClientRoles.data.find((r: { id: any }) => r.id == roleResponses.roleUuid).name
            }
            
            // Select username
            let q = filterQuestions(AddRole.questions, "user", flags);
            let userResponses = q.length > 0 ? await inquirer.prompt(q) : {}

            const targetUsername = flags.username ? flags.username : userResponses.username;
            const allUsers = await this.api("keycloak?target=users&realm=mdos", "get");
            const targetUser = allUsers.data.find((u: { username: any }) => u.username == targetUsername)
            if(!targetUser) {
                error("Username not found");
			    process.exit(1);
            }

            // Make sure this user does not already have this role associated
            const userRolesResponse = await this.api(`keycloak?target=user-roles&realm=mdos&username=${targetUser.username}`, "get")
            const existingMappingsForClient = userRolesResponse.data.clientMappings ? userRolesResponse.data.clientMappings[clientResponses.clientName] : null;
            if(existingMappingsForClient && existingMappingsForClient.mappings.find((m: { name: any }) => m.name == roleResponses.roleName)) {
                warn("User already has this client role");
			    process.exit(1);
            }

            // Add role for user now
            CliUx.ux.action.start('Add role to user')
            try {
                await this.api(`keycloak`, 'post', {
                    type: 'user-role',
                    realm: 'mdos',
                    ...clientResponses,
                    ...roleResponses,
                    username: targetUser.username,
                    userUuid: targetUser.id
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
