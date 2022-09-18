import { Flags } from '@oclif/core'
import Command from '../base'
const { context } = require('../lib/tools')

/**
 * Command
 *
 * @export
 * @class Login
 * @extends {Command}
 */
export default class Login extends Command {
    static description = 'Login to the platform'

    // ******* FLAGS *******
    static flags = {}
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Login)

        // Make sure we are logged out
        const token = this.getConfig('ACCESS_TOKEN')
        if (token && token.length > 0) {
            this.setConfig('ACCESS_TOKEN', '')
        }

        // Login
        try {
            await this.validateJwt()
            context('Logged in', true, true)
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }
    }
}
