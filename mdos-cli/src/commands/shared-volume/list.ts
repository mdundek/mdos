import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { error, context, filterQuestions, mergeFlags, info } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class List
 * @extends {Command}
 */
export default class List extends Command {
    static aliases = ['volume:list']
    static description = 'List existing Shared Volumes'

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
        const { flags } = await this.parse(List)

        let agregatedResponses: any = {}

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if (this.getConfig('FRAMEWORK_ONLY')) {
            // Not supported in framework only mode
            error('This command is only available for MDos managed cluster deployments')
            process.exit(1)
        }

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Get client id & uuid
        let clientResponse
        try {
            clientResponse = await this.collectClientId(flags, 'Select namespace for which you wish to list Shared Volumes for:', true)
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
        
        // Get namespace shared volumes
        let volResponse
        try {
            volResponse = await this.api(`kube?target=shared-volumes&namespace=${clientResponse.clientId}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        if (volResponse.data.length == 0) {
            error('No Shared Volumes found for this namespace')
            process.exit(1)
        }

        console.log()
        CliUx.ux.table(
            volResponse.data,
            {
                name: {
                    header: 'NAME',
                    minWidth: 25,
                    get: (row: any) => row.metadata.name,
                },
                size: {
                    header: 'SIZE',
                    get: (row: any) => row.spec.resources.requests.storage,
                },
            },
            {
                printLine: this.log.bind(this),
            }
        )
        console.log()
    }
}
