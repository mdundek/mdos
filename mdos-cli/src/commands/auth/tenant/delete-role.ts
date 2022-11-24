import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'
const inquirer = require('inquirer')
const { error } = require('../../../lib/tools')

/**
 * Command
 *
 * @export
 * @class DeleteRole
 * @extends {Command}
 */
export default class DeleteRole extends Command {
    static aliases = [
        'client:delete-role',
        'client:delete:role',
        'client:remove-role',
        'client:remove:role',
        'kc:client:delete:role',
        'kc:client:remove-role',
        'kc:client:remove:role',
    ]
    static description = 'Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)'

    // ******* FLAGS *******
    static flags = {
        clientId: Flags.string({ char: 'c', description: 'Keycloak client ID' }),
        role: Flags.string({ char: 'r', description: 'Client role to delete' }),
        force: Flags.boolean({ char: 'f', description: 'Do not ask for comfirmation' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(DeleteRole)

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if(this.getConfig('FRAMEWORK_MODE')) {
            // Not supported in framework only mode
            error("This command is only available for MDos managed environements")
            process.exit(1)
        }
        
        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Get existing clients
        let respClients: { data: any[] }
        try {
            respClients = await this.api(`keycloak?target=clients&realm=mdos`, 'get')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Collect target client
        let clientResponse: { clientUuid: any; clientId: any }
        if (flags.clientId) {
            const targetClient = respClients.data.find((c) => c.clientId == flags.clientId)
            if (!targetClient) {
                error('Client not found')
                process.exit(1)
            }
            clientResponse = {
                clientUuid: targetClient.id,
                clientId: flags.clientId,
            }
        } else {
            clientResponse = await inquirer.prompt([
                {
                    name: 'clientId',
                    message: 'Select a client from which to remove a role from:',
                    type: 'list',
                    choices: respClients.data.map((o) => {
                        return { name: o.clientId, value: o.clientId }
                    }),
                },
            ])
            clientResponse.clientUuid = respClients.data.find((c) => c.clientId == clientResponse.clientId).id
        }

        // Get all Client roles
        let respClientRoles
        try {
            respClientRoles = await this.api(
                `keycloak?target=client-roles&realm=mdos&clientId=${clientResponse.clientId}&filterProtected=true`,
                'get'
            )
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }
        if (respClientRoles.data.length == 0) {
            error('There are no deletable roles asssociated to this client')
            process.exit(1)
        }

        // Collect client role
        let targetRole
        if (flags.role) {
            targetRole = respClientRoles.data.find((r: { name: string | undefined }) => r.name == flags.role)
            if (!targetRole) {
                error('Client role not found')
                process.exit(1)
            }
        } else {
            const roleResponse = await inquirer.prompt([
                {
                    name: 'role',
                    message: 'Select a role to delete from this client:',
                    type: 'list',
                    choices: respClientRoles.data.map((o: { name: any }) => {
                        return { name: o.name, value: o }
                    }),
                },
            ])
            targetRole = roleResponse.role
        }

        // Confirm?
        let confirmed = false
        if (flags.force) {
            confirmed = true
        } else {
            const confirmResponse = await inquirer.prompt([
                {
                    name: 'confirm',
                    message: 'You are about to delete a OIDC provider, are you sure you wish to prosceed?',
                    type: 'confirm',
                    default: false,
                },
            ])
            confirmed = confirmResponse.confirm
        }

        if (confirmed) {
            CliUx.ux.action.start('Deleting Keycloak client role')
            try {
                await this.api(
                    `keycloak/${targetRole.name}?target=client-roles&realm=mdos&clientUuid=${clientResponse.clientUuid}&clientId=${clientResponse.clientId}`,
                    'delete'
                )
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
                this.showError(error)
                process.exit(1)
            }
        }
    }
}
