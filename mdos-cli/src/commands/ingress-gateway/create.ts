import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { error, filterQuestions, mergeFlags } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Create
 * @extends {Command}
 */
export default class Create extends Command {
    static aliases = []
    static description = 'Create a new ingress gateway'

    // ******* FLAGS *******
    static flags = {}
    // *********************

    // ***** QUESTIONS *****
    static questions = []
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Create)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        let gtwResponse
        try {
            gtwResponse = await this.api(`kube?target=gateways&host=mdundek.network`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        let crtResponse
        try {
            crtResponse = await this.api(`kube?target=certificates&host=mdundek.network`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        console.log(crtResponse.data)
    }
}