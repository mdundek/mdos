import { Flags } from '@oclif/core'
import Command from '../../base'
const { error, success } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class SetConfig
 * @extends {Command}
 */
export default class AuthMode extends Command {
    static aliases = []
    static description = 'Set a configutation parameter for your local CLI environement'

    // ******* FLAGS *******
    static flags = {
        dev: Flags.boolean({ description: 'Developement mode, append ports to URLs' }),
    }
    
    // ******* ARGS *******
    static args = [
        {name: 'domain'}
    ]

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(AuthMode)
        const { args } = await this.parse(AuthMode)

        if(!args.domain) {
            error("No auth mode specified")
            process.exit(1)
        } else {
            this.setConfig('MDOS_KC_URI', `https://keycloak.${args.domain}`)
            this.setConfig('MDOS_API_URI', `${flags.dev ? "http":"https"}://mdos-api.${args.domain}${flags.dev ? ":3030":""}`)
            success("Done")
        }
    }
}
