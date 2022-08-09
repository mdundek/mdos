import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class List extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		clientId: Flags.string({ char: 'c', description: 'Keycloak client ID' }),
	}
	// ***** QUESTIONS *****
    static questions = []
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(List)
		
		let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            error("Mdos API server is unavailable");
			process.exit(1);
        }

        if (nsResponse.data.find((ns: { metadata: { name: string } }) => ns.metadata.name == 'keycloak')) {
            try {
                const resp = await this.api(`keycloak?target=users&realm=mdos${flags.clientId ? "&clientId=" + flags.clientId : ""}`, "get")

                console.log();
                CliUx.ux.table(resp.data, {
                    clientId: {
                        header: 'USERNAME',
                        minWidth: 20,
                        get: row => row.username
                    },
                    realm: {
                        header: 'EMAIL',
                        minWidth: 20,
                        get: row => row.email
                    },
                    hasRolesWithClient: {
                        header: 'CLIENTS (has roles with)',
                        get: row => row.clients ? row.clients : ""
                    }
                }, {
                    printLine: this.log.bind(this)
                })
                console.log();
            } catch (error) {
                console.log(error);
            }
		} else {
			warn("Keycloak is not installed");
			process.exit(1);
		}
	}
}
