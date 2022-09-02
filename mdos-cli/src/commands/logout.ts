import { Flags } from '@oclif/core'
import Command from '../base'
const { warn, context, dockerLogout } = require('../lib/tools')

export default class Logout extends Command {
    static description = 'Set a specific config on your local CLI environement'

    static flags = {}

    public async run(): Promise<void> {
        const { flags } = await this.parse(Logout)
        
        const token = this.getConfig("JWT_TOKEN")
        if(token && token.length > 0) {
          // Login
          try {
            let regDomain = await this.api("registry_domain", "GET")
            await dockerLogout(regDomain.data)

            await this.logout()
            context("Logged out", true, true)
            warn("Make sure you closed your default browser (if currently open) before logging back in")
          } catch (error) {
              this.showError(error)
              process.exit(1)
          }
        } else {
          warn("you are not logged in");
        }
    }
}