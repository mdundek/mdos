import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'
const inquirer = require('inquirer')
const { error, warn, filterQuestions } = require('../../../lib/tools')

/**
 * Command
 *
 * @export
 * @class RemoveRole
 * @extends {Command}
 */
export default class RemoveRole extends Command {
    static aliases = ['user:remove:role', 'kc:user:remove:role', 'user:delete-role', 'user:delete:role', 'kc:user:delete:role']
    static description = 'Remove roles from your users for specific namespaces / clients / tenant'

    // ******* FLAGS *******
    static flags = {
        username: Flags.string({ char: 'u', description: 'Keycloak username' }),
        clientId: Flags.string({ char: 'c', description: 'Keycloak client ID' }),
        role: Flags.string({ char: 'r', description: 'Role name to remove' }),
        force: Flags.boolean({ char: 'f', description: 'Do not ask for comfirmation' }),
    }
    // *********************

    // ***** QUESTIONS *****
    static questions = [
        {
            group: 'user',
            type: 'input',
            name: 'username',
            message: 'Enter Keycloak username:',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        },
    ]
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(RemoveRole)

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

        let q = filterQuestions(RemoveRole.questions, 'user', flags)
        let responses = q.length > 0 ? await inquirer.prompt(q) : {}

        // Get all users
        let allUsers
        try {
            allUsers = await this.api('keycloak?target=users&realm=mdos', 'get')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Collect user
        const targetUser = allUsers.data.find((u: { username: any }) => u.username == (flags.username || responses.username))
        if (!targetUser) {
            error('Username not found')
            process.exit(1)
        }

        if (targetUser.clients.length == 0) {
            warn('User has no associated client roles')
            process.exit(1)
        }

        // Get existing clients
        let respClients: { data: any[] }
        try {
            respClients = await this.api(`keycloak?target=clients&realm=mdos&include_mdos=true`, 'get')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Collect target client
        let clientResponses: { clientUuid: any; clientId: any }
        if (flags.clientId) {
            if (targetUser.clients.split(',').find((c: string) => c.trim() == flags.clientId)) {
                clientResponses = {
                    clientUuid: respClients.data.find((c) => c.clientId == flags.clientId).id,
                    clientId: flags.clientId,
                }
            } else {
                error('No user roles found for this Client ID')
                process.exit(1)
            }
        } else {
            clientResponses = await inquirer.prompt([
                {
                    name: 'clientId',
                    message: 'Select a client from which to remove a user role from:',
                    type: 'list',
                    choices: targetUser.clients.split(',').map((o: any) => {
                        return { name: o.trim(), value: o.trim() }
                    }),
                },
            ])
            clientResponses.clientUuid = respClients.data.find((c) => c.clientId == clientResponses.clientId).id
        }

        // Get existing client roles
        let respUserClientRoles
        try {
            respUserClientRoles = await this.api(`keycloak?target=user-roles&realm=mdos&username=${targetUser.username}`, 'get')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Collect user role
        let targetRole
        if (flags.role) {
            targetRole = respUserClientRoles.data
                .filter((rm: { client: any }) => rm.client == clientResponses.clientId)
                .find((rm: { name: string | undefined }) => rm.name == flags.role)
            if (!targetRole) {
                error('Role not found for this user')
                process.exit(1)
            }
        } else {
            const roleResponse = await inquirer.prompt([
                {
                    name: 'role',
                    message: 'Select a role to remove from this user:',
                    type: 'list',
                    choices: respUserClientRoles.data
                        .filter((rm: { client: any }) => rm.client == clientResponses.clientId)
                        .map((o: { name: any }) => {
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
                    message: 'You are about to remove a role for this user, are you sure you wish to prosceed?',
                    type: 'confirm',
                    default: false,
                },
            ])
            confirmed = confirmResponse.confirm
        }

        if (confirmed) {
            CliUx.ux.action.start('Removing Keycloak user role')
            try {
                await this.api(
                    `keycloak/${targetRole.uuid}?target=user-roles&realm=mdos&clientUuid=${clientResponses.clientUuid}&userUuid=${targetUser.id}&roleName=${targetRole.name}&clientId=${clientResponses.clientId}`,
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
