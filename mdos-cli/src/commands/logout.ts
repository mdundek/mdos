import { Flags } from '@oclif/core'
import Command from '../base'
const { warn, info, dockerLogout } = require('../lib/tools')

/**
 * Command
 *
 * @export
 * @class Logout
 * @extends {Command}
 */
export default class Logout extends Command {
    static description = 'Logout from the platform'

    // ******* FLAGS *******
    static flags = {}
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Logout)

        const token = this.getConfig('ACCESS_TOKEN')
        if (token && token.length > 0) {
            // Login
            try {
                let regDomain = await this.api('registry_domain', 'GET')
                await dockerLogout(regDomain.data)

                await this.logout()
                info('Logged out')
            } catch (error) {
                this.showError(error)
                process.exit(1)
            }
        } else {
            warn('you are not logged in')
        }
    }
}
