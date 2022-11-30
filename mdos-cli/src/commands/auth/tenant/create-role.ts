import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'
const inquirer = require('inquirer')
const { error, mergeFlags } = require('../../../lib/tools')

/**
 * Command
 *
 * @export
 * @class CreateRole
 * @extends {Command}
 */
export default class CreateRole extends Command {
    static aliases = [
        'client:create-role',
        'client:create:role',
        'client:add-role',
        'client:add:role',
        'kc:client:create:role',
        'kc:client:add-role',
        'kc:client:add:role',
    ]
    static description = 'Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)'

    // ******* FLAGS *******
    static flags = {
        clientId: Flags.string({ char: 'c', description: 'Keycloak client ID' }),
        name: Flags.string({ char: 'n', description: 'Keycloak clientrole name' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(CreateRole)

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if (this.getConfig('FRAMEWORK_ONLY')) {
            // Not supported in framework only mode
            error('This command is only available for MDos managed cluster deployments')
            process.exit(1)
        }

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Get client id & uuid
        let clientResponse
        try {
            clientResponse = await this.collectClientId(flags, 'Select a Client ID to create a Role for:')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Get existing roles for this client
        let respClientRoles: { data: any[] }
        try {
            respClientRoles = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=${clientResponse.clientId}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Collect / check user role name
        let roleResponses
        if (flags.name) {
            if (flags.name.trim().length == 0) {
                error('Name flag can not be empty')
                process.exit(1)
            } else if (respClientRoles.data.find((o: { name: string }) => o.name.toLowerCase() == (flags.name || '').trim().toLowerCase())) {
                error('Client role already exists')
                process.exit(1)
            }
            roleResponses = {
                name: flags.name,
            }
        } else {
            roleResponses = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Enter the client role name to create:',
                    validate: (value: any) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                            return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                        else if (respClientRoles.data.find((o: { name: string }) => o.name.toLowerCase() == value.trim().toLowerCase()))
                            return 'Role already exists'

                        return true
                    },
                },
            ])
        }

        // Create client role
        CliUx.ux.action.start('Creating Keycloak client role')
        try {
            await this.api(`keycloak`, 'post', {
                type: 'client-role',
                realm: 'mdos',
                ...mergeFlags(
                    {
                        ...roleResponses,
                        ...clientResponse,
                    },
                    flags
                ),
            })
            CliUx.ux.action.stop()
        } catch (err) {
            CliUx.ux.action.stop('error')
            this.showError(err)
            process.exit(1)
        }
    }
}
