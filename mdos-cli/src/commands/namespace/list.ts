import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'

/**
 * Command
 *
 * @export
 * @class List
 * @extends {Command}
 */
export default class List extends Command {
    static aliases = [
        'ns:list',
        'list:ns',
        'list:namespace',
        'list:namespaces',
        'client:list',
        'list:client',
        'ns:show',
        'show:ns',
        'show:namespace',
        'namespace:show',
        'namespaces:show',
        'client:show',
        'show:client',
    ]
    static description = 'List namespaces / clients / tenants'

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

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        let nsQueryUrl
        if (!this.getConfig('FRAMEWORK_ONLY')) {
            // Make sure we have a valid oauth2 cookie token
            // otherwise, collect it
            try {
                await this.validateJwt()
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }
            nsQueryUrl = 'kube?target=namespaces&realm=mdos&includeKcClients=true'
        } else {
            nsQueryUrl = 'kube?target=namespaces'
        }

        // We need a valid admin authentication token, get this first
        try {
            const response = await this.api(nsQueryUrl, 'get')

            console.log()
            CliUx.ux.table(
                response.data,
                this.getConfig('FRAMEWORK_ONLY')
                    ? {
                          namespace: {
                              header: 'NAMESPACE',
                              minWidth: 15,
                              get: (row) => row.name,
                          },
                          status: {
                              header: 'STATUS',
                              minWidth: 10,
                              get: (row) => row.status,
                          },
                      }
                    : {
                          namespace: {
                              header: 'NAMESPACE',
                              minWidth: 15,
                              get: (row) => row.name,
                          },
                          status: {
                              header: 'STATUS',
                              minWidth: 10,
                              get: (row) => row.status,
                          },
                          kcClient: {
                              header: 'HAS KC CLIENT',
                              get: (row) => (row.kcClient ? 'Yes' : 'No'),
                          },
                      },
                {
                    printLine: this.log.bind(this),
                }
            )
            console.log()
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
    }
}
