import { Flags, CliUx } from '@oclif/core'
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
export default class Remove extends Command {
    static aliases = ['gateway:remove']
    static description = 'Remove an existing ingress gateway config'

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
        const { flags } = await this.parse(Remove)

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if (this.getConfig('FRAMEWORK_ONLY')) {
            // Not supported in framework only mode
            error('This command is only available for MDos managed cluster deployments')
            process.exit(1)
        }

        let agregatedResponses: any = {}

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
                message: 'Select namespace for which you wish to delete a Ingress Gateway config from:',
                type: 'list',
                choices: nsResponse.data.map((o: { name: any }) => {
                    return { name: o.name }
                }),
            },
        ])
        agregatedResponses = { ...agregatedResponses, ...response }

        // Get namespace gateway
        let gtwResponse: any
        try {
            gtwResponse = await this.api(`kube?target=gateways&namespace=${response.namespace}&name=mdos-ns-gateway`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        if (gtwResponse.data.length == 0 || gtwResponse.data[0].spec.servers.length == 0) {
            error('No Ingress Gateway configured yet for this namespace')
            process.exit(1)
        }

        console.log()
        let index = 1
        CliUx.ux.table(
            gtwResponse.data[0].spec.servers,
            {
                index: {
                    header: 'NR',
                    minWidth: 5,
                    get: (row: any) => index++,
                },
                name: {
                    header: 'TRAFFIC TYPE',
                    minWidth: 25,
                    get: (row: any) => (row.tls ? (row.tls.mode == 'SIMPLE' ? 'HTTPS, terminate TLS' : 'HTTPS, pass-through') : 'HTTP'),
                },
                hosts: {
                    header: 'HOSTS',
                    get: (row: any) => row.hosts.join('\n'),
                },
                certificate: {
                    header: 'SECRET',
                    get: (row: any) => (row.tls ? (row.tls.mode == 'SIMPLE' ? row.tls.credentialName : '') : ''),
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
                name: 'gatewayServerIndex',
                message: 'What ingress gateway server config number do you wish to delete?',
                type: 'input',
                validate: (value: any) => {
                    const num = Number(value)
                    if (isNaN(num) || (Number.isInteger(num) && num <= 0)) return 'Number (integer) expected'
                    else if (num <= 0 || num > gtwResponse.data[0].spec.servers.length) return 'Index out of range'
                    return true
                },
            },
        ])
        agregatedResponses = { ...agregatedResponses, ...response }

        // Delete gateway server block
        CliUx.ux.action.start('Deleting ingress gateway config')
        try {
            await this.api(`kube/${agregatedResponses.gatewayServerIndex}?target=ingress-gateway&namespace=${agregatedResponses.namespace}`, 'delete')
            CliUx.ux.action.stop()
        } catch (err) {
            CliUx.ux.action.stop('error')
            this.showError(err)
            process.exit(1)
        }
    }
}
