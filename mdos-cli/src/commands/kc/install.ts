import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../lib/tools')
const chalk = require('chalk')

/**
 * Install
 */
export default class Install extends Command {
    static description = 'Install Keycloak onto the platform'

	// ******* FLAGS *******
    static flags = {
        username: Flags.string({ char: 'u', description: 'Keycloak admin username' }),
		password: Flags.string({ char: 'p', description: 'Keycloak admin passsword' }),
		email: Flags.string({ char: 'e', description: 'Keycloak admin email address' })
    }
    // ***** QUESTIONS *****
    static questions = [
        {
            group: "kc-user",
            type: 'text',
            name: 'username',
            message: 'What admin username would you like to configure for Keycloak?',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        },
        {
            group: "kc-user",
            type: 'password',
            name: 'password',
            message: 'What admin password would you like to configure for Keycloak?',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        },
        {
            group: "kc-user",
            type: 'text',
            name: 'email',
            message: 'What is the admin email address?',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        },
        {
            group: "kc-secret",
            type: 'text',
            name: 'clientSecret',
            message: 'Enter the client secret',
            validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        }
    ]
    // ***********************

    public async run(): Promise<void> {
        const { flags } = await this.parse(Install)

        let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            error("Mdos API server is unavailable");
			process.exit(1);
        }
        let kcInfoResponses: any = {}
        if (!nsResponse.data.find((ns: { metadata: { name: string } }) => ns.metadata.name == 'keycloak')) {
            info('Keycloak is not installed, installing it now')

            let q = filterQuestions(Install.questions, "kc-user", flags);
            kcInfoResponses = q.length > 0 ? await inquirer.prompt(q) : {}

            let deployData = null
            CliUx.ux.action.start('Installing Keycloak')
            try {
                deployData = await this.api(`keycloak`, 'post', {
                    type: 'deploy',
                    realm: 'mdos',
                    ...kcInfoResponses,
					...flags
                })
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('Keycloak could not be installed')
                process.exit(1);
            }

            info('Some manual configuration steps are required')

            console.log('  1. Open a browser and go to:')
            console.log(chalk.cyan(`     https://${deployData.data.kcDomain}/admin/master/console/#/realms/master/clients`))
            console.log("  2. From the 'Clients' section, click on the client 'master-realm'")
            console.log("  3. Change 'Access Type' value to 'confidential'")
            console.log("  4. Enable the boolean value 'Service Accounts Enabled'")
            console.log("  5. Set 'Valid Redirect URIs' value to '*'")
            console.log('  6. Save those changes (button at the bottom of the page)')
            console.log("  7. In tab 'Roles', Click on button 'edit' for role 'magage realm'.")
            console.log("     Enable 'Composite roles' and add 'admin' realm to associated roles")
            console.log("  8. Go to the 'Service Account Roles' tab and add the role 'admin' to the 'Assigned Roles' box")
            console.log("  9. Click on tab 'Credentials'")
            console.log()

            const secretResponse = await inquirer.prompt(filterQuestions(Install.questions, "kc-secret", {}))

            CliUx.ux.action.start('Saving config')
            try {
                await this.api(`keycloak`, 'post', {
                    type: 'deploy-post-setup',
                    realm: 'mdos',
                    data: {
                        ...kcInfoResponses,
                        ...secretResponse,
                    }
                })

                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
				process.exit(1);
            }
        } else {
			warn("Keycloak is already installed");
			process.exit(1);
		}
    }
}
