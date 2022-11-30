import { Flags, CliUx } from '@oclif/core'
import { AnyRecord } from 'dns'
import Command from '../../base'
const inquirer = require('inquirer')
const { error, context, filterQuestions, mergeFlags, info } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Delete
 * @extends {Command}
 */
export default class Delete extends Command {
    static aliases = ['volume:remove']
    static description = 'Delete an existing Shared Volume'

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
        const { flags } = await this.parse(Delete)

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

        // Collect namespaces
        let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
        if (nsResponse.data.length == 0) {
            error('No namespaces available. Did you create a new namespace yet (mdos ns create)?')
            process.exit(1)
        }

        // Select target namespace
        let response = await inquirer.prompt([
            {
                name: 'namespace',
                message: 'Select namespace for which you wish to delete a Shared Volumes from:',
                type: 'list',
                choices: nsResponse.data.map((o: { name: any }) => {
                    return { name: o.name }
                }),
            },
        ])
        agregatedResponses = { ...agregatedResponses, ...response }

        // Get namespace shared volumes
        let volResponse: any
        try {
            volResponse = await this.api(`kube?target=shared-volumes&namespace=${agregatedResponses.namespace}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        if (volResponse.data.length == 0) {
            error('No Shared Volumes found for this namespace')
            process.exit(1)
        }

        console.log()
        let index = 1
        CliUx.ux.table(
            volResponse.data,
            {
                index: {
                    header: 'NR',
                    minWidth: 5,
                    get: (row: any) => index++,
                },
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

        // Collect index to delete
        response = await inquirer.prompt([
            {
                name: 'sharedVolumeIndex',
                message: 'What Shared Volume number do you wish to delete?',
                type: 'input',
                validate: (value: any) => {
                    const num = Number(value)
                    if (isNaN(num) || (Number.isInteger(num) && num <= 0)) return 'Number (integer) expected'
                    else if (num <= 0 || num > volResponse.data.length) return 'Index out of range'
                    return true
                },
            },
        ])
        agregatedResponses = { ...agregatedResponses, ...response }

        console.log()
        // Delete shared volume block
        CliUx.ux.action.start('Deleting Shared Volume')
        try {
            await this.api(
                `kube/${volResponse.data[parseInt(agregatedResponses.sharedVolumeIndex) - 1].metadata.name}?target=shared-volume&namespace=${
                    agregatedResponses.namespace
                }`,
                'delete'
            )
            CliUx.ux.action.stop()
        } catch (err) {
            CliUx.ux.action.stop('error')
            this.showError(err)
            process.exit(1)
        }
    }
}
