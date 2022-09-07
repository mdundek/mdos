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
    static flags = {}
    
    // ******* ARGS *******
    static args = [
        {name: 'target'}
    ]

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(AuthMode)
        const { args } = await this.parse(AuthMode)

        if(!args.target) {
            error("No auth mode specified")
            process.exit(1)
        } else {
            const target = args.target.toUpperCase()

            if(target != "OIDC" && target != "API") {
                error(`Invalid auth mode '${args.target}'. Supported modes are 'oidc' or 'api'`)
                process.exit(1)
            }
            this.setConfig('AUTH_MODE', target.toLowerCase())
            success("Done")
        }
    }
}
