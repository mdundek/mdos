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
    static aliases = []
    static description = 'List existting ingress gateway configs'

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

        let agregatedResponses:any = {}

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
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

        // Select target namespace
        let response = await inquirer.prompt([
            {
                name: 'namespace',
                message: 'Select namespace for which you wish to edit the Ingress Gateway for',
                type: 'list',
                choices: nsResponse.data.map((o: { name: any }) => {
                    return { name: o.name }
                }),
            },
        ])
        agregatedResponses = {...agregatedResponses, ...response}

        // Get namespace gateway
        let gtwResponse
        try {
            gtwResponse = await this.api(`kube?target=gateways&namespace=${response.namespace}&name=mdos-ns-gateway`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        if(gtwResponse.data.length == 0) {
            error("No Ingress Gateway configured yet for this namespace")
            process.exit(1)
        }

        console.log()
        CliUx.ux.table(
            gtwResponse.data[0].spec.servers,
            {
                name: {
                    header: 'TRAFFIC TYPE',
                    minWidth: 25,
                    get: (row:any) => row.tls ? (row.tls.mode == "SIMPLE" ? "HTTPS, terminate TLS" : "HTTPS, pass-through") : "HTTP",
                },
                hosts: {
                    header: 'HOSTS',
                    get: (row:any) => row.hosts.join("\n"),
                },
                certificate: {
                    header: 'SECRET',
                    get: (row:any) => row.tls ? (row.tls.mode == "SIMPLE" ? row.tls.credentialName : "") : "",
                }
            },
            {
                printLine: this.log.bind(this),
            }
        )
        console.log()
    }
}