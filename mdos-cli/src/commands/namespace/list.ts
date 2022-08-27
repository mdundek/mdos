import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../lib/tools')
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

       
  
        // We need a valid admin authentication token, get this first
        try {
            const response = await this.api("kube?target=namespaces&realm=mdos&includeKcClients=true", "get")

            console.log();
            CliUx.ux.table(response.data, {
                namespace: {
                    header: 'NAMESPACE',
                    minWidth: 15,
                    get: row => row.name
                },
                status: {
                    header: 'STATUS',
                    minWidth: 10,
                    get: row => row.status
                },
                kcClient: {
                    header: 'HAS KC CLIENT',
                    get: row => row.kcClient ? "Yes" : "No"
                }
            }, {
                printLine: this.log.bind(this)
            })
            console.log();
        } catch (error) {
            this.showError(error);
            process.exit(1);
        }
	}
}
