import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'
const inquirer = require('inquirer')
const { error, warn, filterQuestions } = require('../../../lib/tools')

/**
 * Command
 *
 * @export
 * @class AddRole
 * @extends {Command}
 */
export default class AddRole extends Command {
    static aliases = ['user:add:role', 'kc:user:add:role', 'user:create-role', 'user:create:role', 'kc:user:create:role']
    static description = 'Add roles to your users for specific namespaces / clients / tenant'

    // ******* FLAGS *******
    static flags = {
        target: Flags.string({ char: 't', description: 'Keycloak client target' }),
        username: Flags.string({ char: 'u', description: 'Keycloak username to add role for' }),
        clientId: Flags.string({ char: 'c', description: 'Keycloak clientId of the user' }),
        role: Flags.string({ char: 'r', description: 'Keycloak role name to add to this user' }),
    }
    // *********************

    // ***** QUESTIONS *****
    static questions = [
        {
            group: 'roleTarget',
            type: 'list',
            name: 'target',
            message: 'Do you want to add a role from the Mdos admin client or from a tenant client?',
            choices: [
                {
                    name: 'Mdos admin client role',
                    value: 'mdos',
                },
                {
                    name: 'Tenant client role',
                    value: 'namespace',
                },
            ],
        },
        {
            group: 'user',
            type: 'input',
            name: 'username',
            message: 'What username do you wish to add this client role to:',
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`
                else if (!/^[a-z]+[a-z0-9\-]{2,20}$/.test(value))
                    return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                return true
            },
        },
    ]
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(AddRole)

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

        // Select target client type
        let q = filterQuestions(AddRole.questions, 'roleTarget', flags)
        let userResponses = q.length > 0 ? await inquirer.prompt(q) : {}

        let respClientRoles
        let clientResponse: { clientId: any; clientUuid?: any; clientName?: any }

        if (userResponses.target == 'namespace') {
            // Get client id & uuid
            try {
                clientResponse = await this.collectClientId(flags, 'Select a target Client ID')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }

            // Get all Client roles
            try {
                respClientRoles = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=${clientResponse.clientId}`, 'get')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }

            if (respClientRoles.data.length == 0) {
                error('There are no clients available, or you do not have sufficient permissions to retrieve available clients for this task')
                process.exit(1)
            }
        } else {
            // Get all Client roles
            try {
                respClientRoles = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=mdos`, 'get')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }

            if (respClientRoles.data.length == 0) {
                error('There are no clients available, or you do not have sufficient permissions to retrieve available clients for this task')
                process.exit(1)
            }

            const mdosIncClientResponse = await this.api('keycloak?target=clients&realm=mdos&include_mdos=true', 'get')
            const targetClient = mdosIncClientResponse.data.find((o: { clientId: string }) => o.clientId == 'mdos')

            clientResponse = { clientId: targetClient.clientId, clientUuid: targetClient.id, clientName: targetClient.clientName }
        }

        // Compute target client role
        let roleResponses: { roleName: any; roleUuid: any }
        if (flags.role) {
            const targetRole = respClientRoles.data.find(
                (o: { name: string | undefined; clientRole: boolean }) => o.name == flags.role && o.clientRole == true
            )
            if (!targetRole) {
                error('Could not find role: ' + flags.role)
                process.exit(1)
            }
            roleResponses = { roleUuid: targetRole.id, roleName: targetRole.name }
        } else {
            roleResponses = await inquirer.prompt([
                {
                    name: 'roleUuid',
                    message: 'Select a role to add from this client:',
                    type: 'list',
                    choices: respClientRoles.data.map((o: { name: any; id: any }) => {
                        return { name: o.name, value: o.id }
                    }),
                },
            ])
            roleResponses.roleName = respClientRoles.data.find((r: { id: any }) => r.id == roleResponses.roleUuid).name
        }

        // Select username
        q = filterQuestions(AddRole.questions, 'user', flags)
        userResponses = q.length > 0 ? await inquirer.prompt(q) : {}

        const targetUsername = flags.username ? flags.username : userResponses.username

        let allUsers
        try {
            allUsers = await this.api('keycloak?target=users&realm=mdos', 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        const targetUser = allUsers.data.find((u: { username: any }) => u.username == targetUsername)
        if (!targetUser) {
            error('Username not found')
            process.exit(1)
        }

        // Make sure this user does not already have this role associated
        let userRolesResponse
        try {
            userRolesResponse = await this.api(`keycloak?target=user-roles&realm=mdos&username=${targetUser.username}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        const existingMappingsForClient = userRolesResponse.data.filter((cm: { client: any }) => cm.client == clientResponse.clientId)
        if (existingMappingsForClient.find((m: { name: any }) => m.name == roleResponses.roleName)) {
            warn('User already has this client role')
            process.exit(1)
        }

        // Add role for user now
        CliUx.ux.action.start('Add role to user')
        try {
            await this.api(`keycloak`, 'post', {
                type: 'user-role',
                realm: 'mdos',
                ...clientResponse,
                ...roleResponses,
                username: targetUser.username,
                userUuid: targetUser.id,
            })
            CliUx.ux.action.stop()
        } catch (err) {
            CliUx.ux.action.stop('error')
            this.showError(err)
            process.exit(1)
        }
    }
}
