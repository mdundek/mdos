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
            validate: (value: any) => {
                if(value.trim().length == 0)
                    return `Mandatory field`
                else if(!(/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value)))
                    return "Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)"
                return true
            }
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

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt();
        } catch (error) {
            this.showError(error);
			process.exit(1);
        }
		
        let q = filterQuestions(Create.questions, "user", flags);
        let responses = q.length > 0 ? await inquirer.prompt(q) : {}

        CliUx.ux.action.start('Creating Keycloak user')
        try {
            await this.api(`keycloak`, 'post', {
                type: 'user',
                realm: 'mdos',
                ...mergeFlags(responses, flags),
            })
            CliUx.ux.action.stop()

            // Now ask if we want to add user roles
            await this.addClientRoles(flags, responses.username);
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error);
            process.exit(1);
        }
	}

    /**
     * addClientRoles
     * @param flags 
     * @param username 
     */
    async addClientRoles(flags: any, username: any) {
        console.log()

        // Collect data
        let responses = await inquirer.prompt([
            {
				type: 'confirm',
				name: 'addRoles',
				default: true,
				message: 'Do you want to add some client roles to this user'
            }
		])

        if(responses.addRoles) {
            // Get client id & uuid
            let clientResponse
            try {
                clientResponse = await this.collectClientId(flags, 'Select a target Client ID to add roles from');
            } catch (error) {
                this.showError(error);
                process.exit(1);
            }

            // Get all Client roles
            let respClientRoles
            try {
                respClientRoles = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=${clientResponse.clientId}`, "get")
            } catch (error) {
                this.showError(error);
                process.exit(1);
            }

            // Target roles
            responses = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'targetRoles',
                    message: 'Selectt roles to add',
                    choices: respClientRoles.data.map((r: { name: any }) => r.name)
                }
            ])

            if(responses.targetRoles.length == 0) {
                warn("No roles added");
            } else {

                // Build role array
                const rolesToAdd = respClientRoles.data.filter((r: { name: any }) => responses.targetRoles.includes(r.name)).map((r: { name: any; id: any }) => {
                    return { roleName: r.name, roleUuid: r.id }
                })

                // Lookup user
                let allUsers;
                try {
                    allUsers = await this.api("keycloak?target=users&realm=mdos", "get");
                } catch (error) {
                    this.showError(error);
                    process.exit(1);
                }
                const targetUser = allUsers.data.find((u: { username: any }) => u.username == username)

                // Add role for user now
                CliUx.ux.action.start('Add role to user')
                try {
                    await this.api(`keycloak`, 'post', {
                        type: 'user-role',
                        realm: 'mdos',
                        ...clientResponse,
                        roles: rolesToAdd,
                        username: targetUser.username,
                        userUuid: targetUser.id
                    })
                    CliUx.ux.action.stop()
                } catch (error) {
                    CliUx.ux.action.stop('error')
                    this.showError(error);
                    process.exit(1);
                }

            }
        }
    }
}
