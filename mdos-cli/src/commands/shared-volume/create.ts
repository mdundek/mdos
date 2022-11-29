import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { error, context, filterQuestions, mergeFlags, info } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Add
 * @extends {Command}
 */
export default class Create extends Command {
    static aliases = ['volume:create']
    static description = 'Create a new shared volume'

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
                message: 'Select namespace for which you wish to create a Shared Volume for:',
                type: 'list',
                choices: nsResponse.data.map((o: { name: any }) => {
                    return { name: o.name }
                }),
            },
        ])
        agregatedResponses = { ...agregatedResponses, ...response }

        // Collect shared volumes
        let sharedVolumesResponse: { data: any[] }
        try {
            sharedVolumesResponse = await this.api(`kube?target=volumes&namespace=${agregatedResponses.namespace}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Collect name
        response = await inquirer.prompt({
            type: 'input',
            name: 'name',
            message: 'Enter a name for your Shared Volume:',
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`
                else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                    return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                else if (sharedVolumesResponse.data.find((vol: any) => vol.metadata.name.toLowerCase() == value.trim().toLowerCase()))
                    return 'Volume name already exists'
                return true
            },
        })
        agregatedResponses = { ...agregatedResponses, ...response }

        // Collect size
        response = await inquirer.prompt({
            type: 'input',
            name: 'size',
            message: 'What size do you want to allocate to this shared volume:',
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`
                else if (!/^([0-9.]+)([eEinumkKMGTP]+)$/.test(value)) return 'Invalid value, ex 10Gi'
                return true
            },
        })
        agregatedResponses = { ...agregatedResponses, ...response }

        // Create volume
        console.log()
        CliUx.ux.action.start('Creating shared volume')
        try {
            await this.api(`kube`, 'post', {
                type: 'shared-volume',
                ...mergeFlags(agregatedResponses, flags),
            })
            CliUx.ux.action.stop()
        } catch (err) {
            CliUx.ux.action.stop('error')
            this.showError(err)
            process.exit(1)
        }
    }
}
