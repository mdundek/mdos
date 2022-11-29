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

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        let clientResponse
        let nsResponse

        if (!this.getConfig('FRAMEWORK_ONLY')) {
            nsResponse = {}
            // Make sure we have a valid oauth2 cookie token
            // otherwise, collect it
            try {
                await this.validateJwt()
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }

            // Get client id & uuid
            try {
                clientResponse = await this.collectClientId(flags, 'What client do you want to list applications for?', true)
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }
        } else {
            clientResponse = {}
            // Get namespace
            try {
                nsResponse = await this.collectNamespace(flags, 'What namespace do you want to list applications for?')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }
        }

        // List apps
        try {
            const response = await this.api(
                `kube?target=applications&clientId=${this.getConfig('FRAMEWORK_ONLY') ? nsResponse.name : clientResponse.clientId}`,
                'get'
            )
            const treeData = computeApplicationTree(response.data, this.getConfig('FRAMEWORK_ONLY') ? false : clientResponse.clientId == '*')

            console.log()

            if (Object.keys(treeData).length == 0) {
                context(
                    this.getConfig('FRAMEWORK_ONLY')
                        ? 'There are no applications deployed for this namespace'
                        : 'There are no applications deployed, or you do not have sufficient permissions to see them',
                    true,
                    true
                )
            } else {
                console.log(treeify.asTree(treeData, true))
            }
        } catch (err) {
            CliUx.ux.action.stop('error')
            this.showError(err)
            process.exit(1)
        }
    }
}
