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
    static aliases = [
        'ns:create',
        'create:ns',
        'create:namespace',
        'client:create',
        'create:client',
        'ns:add',
        'add:ns',
        'add:namespace',
        'namespaces:add',
        'client:add',
        'add:client',
    ]
    static description = 'Create a new namespace / client / tenant'

    // ******* FLAGS *******
    static flags = {
        namespace: Flags.string({ char: 'n', description: 'Keycloak client ID' }),
    }
    // *********************

    // ***** QUESTIONS *****
    static questions = [
        {
            group: 'client',
            type: 'input',
            name: 'namespace',
            message: 'Enter a namespace name to create:',
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`
                else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                    return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                return true
            },
        },
    ]
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

        let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        let q = filterQuestions(Create.questions, 'client', flags)
        let responses = q.length > 0 ? await inquirer.prompt(q) : {}

        if (nsResponse.data.find((ns: { name: string }) => ns.name == (flags.namespace || responses.namespace))) {
            error('Namespace already exists')
            process.exit(1)
        }

        CliUx.ux.action.start('Creating namespace')
        try {
            await this.api(`kube`, 'post', {
                type: 'tenantNamespace',
                realm: 'mdos',
                ...mergeFlags(responses, flags),
            })
            CliUx.ux.action.stop()
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error)
            process.exit(1)
        }
    }
}
