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
    static aliases = ['gateway:list']
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

        let agregatedResponses: any = {}

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if(this.getConfig('FRAMEWORK_MODE')) {
            // Not supported in framework only mode
            error("This command is only available for MDos managed environements")
            process.exit(1)
        }
        
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
        if (nsResponse.data.length == 0) {
            error('No namespaces available. Did you create a new namespace yet (mdos ns create)?')
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
        agregatedResponses = { ...agregatedResponses, ...{ namespace: clientResponse.clientId } }

        // Get namespace gateway
        let gtwResponse
        try {
            gtwResponse = await this.api(`kube?target=gateways&namespace=${agregatedResponses.namespace}&name=mdos-ns-gateway`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        if (gtwResponse.data.length == 0) {
            warn('No Ingress Gateway configured yet for this namespace')
            process.exit(1)
        }

        let allServers: any[] = []
        gtwResponse.data.forEach((gtw: any) => {
            gtw.spec.servers = gtw.spec.servers.map((server: any) => {
                server.namespace = gtw.metadata.namespace
                return server
            })
            allServers = allServers.concat(gtw.spec.servers)
        })

        console.log()
        CliUx.ux.table(
            allServers,
            {
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
                namespace: {
                    header: 'NAMESPACE',
                    get: (row: any) => row.namespace,
                },
            },
            {
                printLine: this.log.bind(this),
            }
        )
        console.log()
    }
}
