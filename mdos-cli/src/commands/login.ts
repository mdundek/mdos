import { Flags } from '@oclif/core'
import Command from '../base'
const { error, context } = require('../lib/tools')
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

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if(this.getConfig('FRAMEWORK_MODE')) {
            // Not supported in framework only mode
            error("This command is only available for MDos managed environements")
            process.exit(1)
        }

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
