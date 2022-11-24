import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'
const inquirer = require('inquirer')
const { error, filterQuestions } = require('../../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Delete
 * @extends {Command}
 */
export default class Delete extends Command {
    static aliases = ['user:delete', 'user:remove', 'kc:user:remove']
    static description = 'Delete a user from the platform'

    // ******* FLAGS *******
    static flags = {
        username: Flags.string({ char: 'u', description: 'Keycloak username to delete' }),
        force: Flags.boolean({ char: 'f', description: 'Do not ask for comfirmation' }),
    }
    // *********************

    // ***** QUESTIONS *****
    static questions = [
        {
            group: 'user',
            type: 'input',
            name: 'username',
            message: 'Enter Keycloak username to delete:',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        },
    ]
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Delete)

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

        let q = filterQuestions(Delete.questions, 'user', flags)
        let responses = q.length > 0 ? await inquirer.prompt(q) : {}

        let allUsers
        try {
            allUsers = await this.api('keycloak?target=users&realm=mdos', 'get')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        const targetUser = allUsers.data.find((u: { username: any }) => u.username == responses.username)
        if (!targetUser) {
            error('Username not found')
            process.exit(1)
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
            CliUx.ux.action.start('Deleting Keycloak user')
            try {
                await this.api(`keycloak/${targetUser.id}?target=users&realm=mdos`, 'delete')
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
                this.showError(error)
                process.exit(1)
            }
        }
    }
}
