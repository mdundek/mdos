import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

/**
 * Command
 */
export default class ListRoles extends Command {
    static aliases = ['client:list-roles', 'client:list:roles', 'client:show-roles', 'client:show:roles', 'kc:client:list:roles', 'kc:client:show-roles', 'kc:client:show:roles']
    static description = 'List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)'

    // ******* FLAGS *******
    static flags = {
        clientId: Flags.string({ char: 'c', description: 'Keycloak aclient ID' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(ListRoles)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        try {
            // Get client id & uuid
            const clientResponse = await this.collectClientId(flags, 'Select a Client ID to list roles for')

            const response = await this.api(`keycloak?target=client-roles&realm=mdos&clientId=${flags.clientId ? flags.clientId : clientResponse.clientId}`, 'get')

            console.log()
            CliUx.ux.table(
                response.data,
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
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }
    }
}
