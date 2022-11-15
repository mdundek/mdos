import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const { context, computeApplicationTree } = require('../../lib/tools')
var treeify = require('treeify')

/**
 * Command
 *
 * @export
 * @class List
 * @extends {Command}
 */
export default class List extends Command {
    static aliases = ['apps:list', 'app:list', 'list:app', 'list:apps', 'list:application', 'list:applications', 'applications:list']
    static description = 'List your applications'

    // ******* FLAGS *******
    static flags = {
        clientId: Flags.string({ char: 'c', description: 'Keycloak clientId to look for applications for?' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(List)

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
            clientResponse = await this.collectClientId(flags, 'What client do you want to list applications for')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // List apps
        try {
            const response = await this.api(`kube?target=applications&clientId=${clientResponse.clientId}`, 'get')

            let gtwResponseAlt = await this.api(`kube?target=applications&clientId=*`, 'get')
            console.log(gtwResponseAlt.data)

            const treeData = computeApplicationTree(response.data)

            console.log()

            if (Object.keys(treeData).length == 0) {
                context('No applications deployed for this tenant', true, true)
            } else {
                console.log(treeify.asTree(treeData, true))
            }
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error)
            process.exit(1)
        }
    }
}
