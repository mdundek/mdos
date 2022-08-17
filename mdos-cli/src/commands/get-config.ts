import { Flags } from '@oclif/core'
import Command from '../base'
const { context } = require('../lib/tools')

export default class GetConfig extends Command {
    static description = 'Get a specific config on your local CLI environement'

    static flags = {
        auth: Flags.boolean({ description: 'authentication mode' }),
        backend: Flags.boolean({ description: 'API backend URI' })
    }

    public async run(): Promise<void> {
        const { flags } = await this.parse(GetConfig)
        if(flags.auth) {
          context(this.getConfig("auth_mode"));
        }
        else if(flags.backend) {
          context(this.getConfig("MDOS_API_URI"));
        }
        else {
          this.error("Missing or unknown flag value");
        }
    }
}
