import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'
const { error, filterQuestions, mergeFlags } = require('../../../lib/tools')

/**
 * Command
 *
 * @export
 * @class List
 * @extends {Command}
 */
export default class List extends Command {
    static aliases = [
        'oidc:list',
        'oidc:providers:list',
        'sso:list',
        'sso:provider:list',
        'sso:provider:show',
        'sso:providers:list',
        'sso:providers:show',
    ]
    static description = 'List the deployed OIDC providers for the platform'

    // ******* FLAGS *******
    static flags = {
        // username: Flags.string({ char: 'u', description: 'Keycloak admin username' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(List)

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

        try {
            const resp = await this.api(`oidc-provider`, 'get')

            console.log()
            CliUx.ux.table(
                resp.data,
                {
                    clientId: {
                        header: 'NAME',
                        minWidth: 20,
                        get: (row) => row.name,
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
