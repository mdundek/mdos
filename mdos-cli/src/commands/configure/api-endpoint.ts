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
export default class ApiEndpoint extends Command {
    static aliases = []
    static description = 'Set the MDos API endpoint URL to use'

    // ******* FLAGS *******
    static flags = {
        dev: Flags.boolean({ description: 'Developement mode, append ports to URLs' }),
    }
    
    // ******* ARGS *******
    static args = [
        {name: 'uri'}
    ]

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(ApiEndpoint)
        const { args } = await this.parse(ApiEndpoint)

        if(!args.uri) {
            error("No uri specified")
            process.exit(1)
        } else {
            try {
                await this.setApiEndpoint(`${args.uri}${flags.dev ? ":3030":""}`)
                success("Done")
            } catch (error) {
                this.showError(error)
                process.exit(1)
            }
        }
    }
}
