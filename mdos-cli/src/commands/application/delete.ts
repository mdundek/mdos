import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { warn } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Delete
 * @extends {Command}
 */
export default class Delete extends Command {
    static aliases = ['app:delete', 'delete:app', 'delete:application', 'delete:applications', 'applications:delete']
    static description = 'Delete an application'

    // ******* FLAGS *******
    static flags = {
        clientId: Flags.string({ char: 'c', description: 'Keycloak clientId to look for applications for' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Delete)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Get client id & uuid
        let clientResponse
        try {
            clientResponse = await this.collectClientId(flags, 'What client do you want to delete an applications for?')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Get namespace applications
        let appResponses
        try {
            appResponses = await this.api(`kube?target=applications&clientId=${clientResponse.clientId}`, 'get')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }
        if (appResponses.data.length == 0) {
            warn('There are no applications found for this client ID that you can delete')
            process.exit(1)
        }

        // Select app to del
        let appToDelResponse = await inquirer.prompt([
            {
                name: 'app',
                message: 'Which application do you wish to delete?',
                type: 'list',
                choices: appResponses.data.map((o: { name: any }) => {
                    return { name: o.name, value: o }
                }),
            },
        ])

        // List apps
        CliUx.ux.action.start('Deleting application')
        try {
            await this.api(
                `kube/${appToDelResponse.app.name}?target=application&clientId=${clientResponse.clientId}&isHelm=${
                    appToDelResponse.app.isHelm
                }&type=${appToDelResponse.app.isHelm ? 'na' : appToDelResponse.app.type}`,
                'delete'
            )
            CliUx.ux.action.stop()
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error)
            process.exit(1)
        }
    }
}
