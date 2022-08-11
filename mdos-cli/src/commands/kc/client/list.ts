import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class List extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {}
	// ***** QUESTIONS *****
    static questions = []
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(List)
		
        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt();
        } catch (error) {
            this.showError(error);
			process.exit(1);
        }
        
		let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            this.showError(err);
			process.exit(1);
        }

        if (nsResponse.data.find((ns: { metadata: { name: string } }) => ns.metadata.name == 'keycloak')) {
            // We need a valid admin authentication token, get this first
            try {
                const response = await this.api("keycloak?target=clients&realm=mdos", "get")

                console.log();
                CliUx.ux.table(response.data, {
                    clientId: {
                        header: 'CLIENT ID',
                        minWidth: 20,
                        get: row => row.clientId
                    },
                    realm: {
                        header: 'REALM',
                        minWidth: 7,
                        get: row => row.realm
                    },
                    enabled: {
                        header: 'ENABLED',
                        get: row => row.enabled ? "true" : "false"
                    }
                }, {
                    printLine: this.log.bind(this)
                })
                console.log();
            } catch (error) {
                this.showError(error);
                process.exit(1);
            }
		} else {
			warn("Keycloak is not installed");
			process.exit(1);
		}
	}
}
