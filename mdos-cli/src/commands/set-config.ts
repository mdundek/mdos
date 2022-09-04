import { Flags } from '@oclif/core'
import Command from '../base'

/**
 * Command
 *
 * @export
 * @class SetConfig
 * @extends {Command}
 */
export default class SetConfig extends Command {
    static aliases = ['set:config', 'add:config', 'add-config']
    static description = 'Set a configutation parameter for your local CLI environement'

    // ******* FLAGS *******
    static flags = {
        auth: Flags.string({ description: 'authentication mode, "none" or "oidc"' }),
        backend: Flags.string({ description: 'API backend URI, "http(s)://mdos-api.<domain-name>"' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(SetConfig)
        if (flags.auth) {
            if (flags.auth != 'none' && flags.auth != 'oidc') {
                this.error('Unknown auth flag')
            } else {
                this.setConfig('AUTH_MODE', flags.auth)
            }
        } else if (flags.backend) {
            this.setConfig('MDOS_API_URI', flags.backend)
        } else {
            this.error('Missing or unknown flag value')
        }
    }
}
