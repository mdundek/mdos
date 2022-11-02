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

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
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
            }
        ])

        if(response.password !== response.passwordConfirm) {
            error("Passwords do not match")
            process.exit(1)
        }

        console.log()
        CliUx.ux.action.start('Changing your keycloak password')
        try {
            await this.api(`keycloak`, 'post', {
                type: 'change-password',
                realm: 'mdos',
                username: userToken.username,
                password: response.password
            })
            CliUx.ux.action.stop()
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error)
            process.exit(1)
        }
    }
}
