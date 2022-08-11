import { Flags } from '@oclif/core'
import Command from '../base'

export default class SetConfig extends Command {
    static description = 'Set a specific config on your local CLI environement'

    static flags = {
        auth: Flags.string({ description: 'authentication mode, "none" or "oidc"' })
    }

    public async run(): Promise<void> {
        const { flags } = await this.parse(SetConfig)
        if(flags.auth) {
          if(flags.auth != "none" && flags.auth != "oidc") {
            this.error("Unknown auth flag");
          } else {
            this.setConfig("auth_mode", flags.auth);
          }
        } else {
          this.error("Missing or unknown flag value");
        }
    }
}
