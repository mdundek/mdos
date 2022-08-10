import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../../lib/tools')
const chalk = require('chalk')

export default class ListRoles extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		username: Flags.string({ char: 'u', description: 'Keycloak username to get roles for' }),
	}
	// ***** QUESTIONS *****
    static questions = [
        {
            group: "user",
            type: 'text',
            name: 'username',
            message: 'What username do you wish to get the roles for?',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        }
    ]
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(ListRoles)
		
		let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get', false)
        } catch (err) {
            error("Mdos API server is unavailable");
			process.exit(1);
        }

        if (nsResponse.data.find((ns: { metadata: { name: string } }) => ns.metadata.name == 'keycloak')) {
            let q = filterQuestions(ListRoles.questions, "user", flags);
            let responses = q.length > 0 ? await inquirer.prompt(q) : {}

            try {
                const resp = await this.api(`keycloak?target=user-roles&realm=mdos&username=${flags.username ? flags.username : responses.username}`, "get", true)
                
                const tblData: any[] = [];
                if(resp.data.clientMappings) {
                    (Object.keys(resp.data.clientMappings) as (keyof typeof resp.data.clientMappings)[]).forEach((key) => {
                        resp.data.clientMappings[key].mappings.forEach((cm: { name: any; id: any }) => {
                            tblData.push({
                                client: key,
                                uuid: cm.id,
                                name: cm.name
                            });
                        });
                    });
                }
               
                console.log();
                CliUx.ux.table(tblData, {
                    clientId: {
                        header: 'CLIENT',
                        minWidth: 20,
                        get: row => row.client
                    },
                    realm: {
                        header: 'ROLE NAME',
                        minWidth: 20,
                        get: row => row.name
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
