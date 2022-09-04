import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

/**
 * Command
 *
 * @export
 * @class List
 * @extends {Command}
 */
export default class List extends Command {
    static aliases = ['user:list']
    static description = 'List all platform users'

    // ******* FLAGS *******
    static flags = {
        clientId: Flags.string({ char: 'c', description: 'Keycloak client ID' }),
    }
    // *********************

    // ***** QUESTIONS *****
    static questions = []
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(List)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        let resp
        try {
            resp = await this.api(`keycloak?target=users&realm=mdos${flags.clientId ? '&clientId=' + flags.clientId : ''}`, 'get')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        resp.data = resp.data.filter((u: { email: any }) => u.email)

        console.log()
        CliUx.ux.table(
            resp.data,
            {
                clientId: {
                    header: 'USERNAME',
                    minWidth: 20,
                    get: (row) => row.username,
                },
                realm: {
                    header: 'EMAIL',
                    minWidth: 20,
                    get: (row) => row.email,
                },
                hasRolesWithClient: {
                    header: 'CLIENTS (has roles with)',
                    get: (row) => (row.clients ? row.clients : ''),
                },
            },
            {
                printLine: this.log.bind(this),
            }
        )
        console.log()
    }
}
