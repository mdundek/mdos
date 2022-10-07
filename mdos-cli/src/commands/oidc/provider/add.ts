import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'
const inquirer = require('inquirer')
const { warn, filterQuestions, mergeFlags } = require('../../../lib/tools')
const fs = require('fs')
const path = require('path')

/**
 * Command
 *
 * @export
 * @class Add
 * @extends {Command}
 */
export default class Add extends Command {
    static aliases = ['oidc:create', 'oidc:provider:create', 'sso:create', 'sso:provider:create', 'sso:provider:add']
    static description = 'Configure / add a new OIDC provider to the platform'

    // ******* FLAGS *******
    static flags = {
        target: Flags.string({ char: 't', description: 'OIDC target' }),
        clienId: Flags.string({ description: 'Keycloak client id name' }),
    }
    // *********************

    // ***** QUESTIONS *****
    static questions = [
        {
            group: 'oidc',
            type: 'list',
            name: 'target',
            message: 'What OIDC target do you want to add to the platform?',
            choices: ['Keycloak client', 'Google'],
            filter(val: string) {
                return val.toLowerCase()
            },
        },
        {
            group: 'oidc',
            type: 'text',
            name: 'providerName',
            message: 'Enter a name for this provider:',
            when: (values: any) => {
                return values.target == 'google'
            },
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`
                else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,10}$/.test(value))
                    return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 10 characters)'
                return true
            }
        },
        {
            group: 'oidc',
            type: 'text',
            name: 'jsonSecretPath',
            message: 'Enter the path to your Google JSON credentials file:',
            when: (values: any) => {
                return values.target == 'google'
            },
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`
                if (!fs.existsSync(value)) {
                    return 'File not found'
                }
                if(!value.toLowerCase().endsWith('.json')) {
                    return 'Expect a JSON file'
                }
                return true
            },
        },
    ]
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Add)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        let q = filterQuestions(Add.questions, 'oidc', flags)
        const oidcResponses = q.length > 0 ? await inquirer.prompt(q) : {}

        if (oidcResponses.target == 'keycloak client') {
            // Get client id & uuid
            let clientResponse
            try {
                clientResponse = await this.collectClientId(flags, 'Select a Client ID')
            } catch (error) {
                this.showError(error)
                process.exit(1)
            }

            // Create new client in Keycloak
            CliUx.ux.action.start('Creating Keycloak client & OIDC provider')
            try {
                await this.api(`oidc-provider`, 'post', {
                    type: 'keycloak',
                    realm: 'mdos',
                    data: {
                        ...mergeFlags(clientResponse, flags),
                        name: `kc-${clientResponse.clientId}`,
                    },
                })
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
                this.showError(error)
                process.exit(1)
            }
        } 
        else if (oidcResponses.target == 'google') {
            const authJsonText = fs.readFileSync(oidcResponses.jsonSecretPath, {encoding:'utf8', flag:'r'})
            let authJson = null
            try {
                authJson = JSON.parse(authJsonText)
            } catch (error) {
                
            }
            // Create new client in Keycloak
            CliUx.ux.action.start('Creating Google OIDC provider')
            try {
                await this.api(`oidc-provider`, 'post', {
                    type: 'google',
                    data: {
                        name: `google-${oidcResponses.providerName}`,
                        googleClientId: authJson.web.client_id,
                        googleClientSecret: authJson.web.client_secret,
                        redirectUris: authJson.web.redirect_uris
                    },
                })
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
                this.showError(error)
                process.exit(1)
            }
        }
        else {
            warn(`OIDC provider "${oidcResponses.target}" not implemented yet`)
            process.exit(1)
        }
    }
}
