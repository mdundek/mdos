import { Flags } from '@oclif/core'
import Command from '../base'
const { warn, context } = require('../lib/tools')

export default class Login extends Command {
    static description = 'Login mdos user'

    static flags = {}

    public async run(): Promise<void> {
        const { flags } = await this.parse(Login)

		// Make sure we are logged out
		const token = this.getConfig("JWT_TOKEN")
        if(token && token.length > 0) {
          this.setConfig("JWT_TOKEN", "");
        }

        // Login
        try {
            await this.validateJwt()
            context("Logged in", true, true)
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }
    }
}