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

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt();
        } catch (error) {
            this.showError(error);
			process.exit(1);
        }
		
        // Get client id & uuid
        let clientResponse;
        try {
            clientResponse = await this.collectClientId(flags, 'Select a Client ID to create a Role for');
        } catch (error) {
            this.showError(error);
            process.exit(1);
        }

        // Get existing roles for this client
        let respClientRoles: { data: any[] }
        try {
            respClientRoles = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=${clientResponse.clientId}`, "get")
        } catch (error) {
            this.showError(error);
            process.exit(1);
        }

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
                validate: (value: any) => {
                    if( value.trim().length == 0)
                        return "Mandatory field"
                    else if(!(/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value)))
                        return "Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)"
                    else if(respClientRoles.data.find((o: { name: string }) => o.name.toLowerCase() == value.trim().toLowerCase()))
                        return "Role already exists";
                    
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
                        ...clientResponse, 
                    }, flags),
            })
            CliUx.ux.action.stop()
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error);
            process.exit(1);
        }
	}
}
