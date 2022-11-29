import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'
const inquirer = require('inquirer')
const { error, warn, filterQuestions } = require('../../../lib/tools')

/**
 * Command
 *
 * @export
 * @class ListRoles
 * @extends {Command}
 */
export default class ListRoles extends Command {
    static aliases = [
        'user:list-roles',
        'user:list:roles',
        'user:show-roles',
        'user:show:roles',
        'kc:user:list:roles',
        'kc:user:show-roles',
        'kc:user:show:roles',
    ]
    static description = 'List user assigned roles for specific namespaces / clients / tenant'

    // ******* FLAGS *******
    static flags = {
        username: Flags.string({ char: 'u', description: 'Keycloak username to get roles for' }),
    }
    // *********************

    // ***** QUESTIONS *****
    static questions = [
        {
            group: 'user',
            type: 'input',
            name: 'username',
            message: 'What username do you wish to get the roles for:',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        },
    ]
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(ListRoles)

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if (this.getConfig('FRAMEWORK_ONLY')) {
            // Not supported in framework only mode
            error('This command is only available for MDos managed environements')
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

        let q = filterQuestions(ListRoles.questions, 'user', flags)
        let responses = q.length > 0 ? await inquirer.prompt(q) : {}

        let resp
        try {
            resp = await this.api(`keycloak?target=user-roles&realm=mdos&username=${flags.username ? flags.username : responses.username}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        console.log()
        CliUx.ux.table(
            resp.data,
            {
                clientId: {
                    header: 'CLIENT',
                    minWidth: 20,
                    get: (row) => row.client,
                },
                realm: {
                    header: 'ROLE NAME',
                    minWidth: 20,
                    get: (row) => row.name,
                },
            },
            {
                printLine: this.log.bind(this),
            }
        )
        console.log()
    }
}
