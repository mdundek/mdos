import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { error, warn, context, filterQuestions, mergeFlags, info } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class List
 * @extends {Command}
 */
export default class List extends Command {
    static aliases = ["gateway:list"]
    static description = 'List existing ingress gateway configs'

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
        if(nsResponse.data.length == 0) {
            error("No namespaces available. Did you create a new namespace yet (mdos ns create)?")
            process.exit(1)
        }

        // Get client id & uuid
        let clientResponse
        try {
            clientResponse = await this.collectClientId(flags, 'Select namespace for which you wish to list Ingress Gateways for:', true)
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // // Select target namespace
        // let response = await inquirer.prompt([
        //     {
        //         name: 'namespace',
        //         message: 'Select namespace for which you wish to list Ingress Gateways for:',
        //         type: 'list',
        //         choices: nsResponse.data.map((o: { name: any }) => {
        //             return { name: o.name }
        //         }),
        //     },
        // ])
        agregatedResponses = {...agregatedResponses, ...{namespace: clientResponse.clientId}}

        // Get namespace gateway
        let gtwResponse
        try {
            gtwResponse = await this.api(`kube?target=gateways&namespace=${agregatedResponses.namespace}&name=mdos-ns-gateway`, 'get')
            let gtwResponseAlt = await this.api(`kube?target=gateways&name=mdos-ns-gateway`, 'get')
            console.log(gtwResponseAlt.data)
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        if(gtwResponse.data.length == 0) {
            warn("No Ingress Gateway configured yet for this namespace")
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