import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { error, filterQuestions, mergeFlags } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Create
 * @extends {Command}
 */
export default class ChangePassword extends Command {
    static aliases = []
    static description = 'Change Password for a logged in user'

    // ******* FLAGS *******
    static flags = {}
    // *********************

    // ***** QUESTIONS *****
    static questions = []
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(ChangePassword)

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if (this.getConfig('FRAMEWORK_ONLY')) {
            // Not supported in framework only mode
            error('This command is only available for MDos managed environements')
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

        const userToken = await this.introspectJwt()

        let response = await inquirer.prompt([
            {
                type: 'password',
                name: 'password',
                message: 'Enter your new password:',
                validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
            },
            {
                type: 'password',
                name: 'passwordConfirm',
                message: 'Confirm password:',
                validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
            },
        ])

        if (response.password !== response.passwordConfirm) {
            error('Passwords do not match')
            process.exit(1)
        }

        console.log()
        CliUx.ux.action.start('Changing your keycloak password')
        try {
            await this.api(`keycloak`, 'post', {
                type: 'change-password',
                realm: 'mdos',
                username: userToken.username,
                password: response.password,
            })
            CliUx.ux.action.stop()
        } catch (err) {
            CliUx.ux.action.stop('error')
            this.showError(err)
            process.exit(1)
        }
    }
}
