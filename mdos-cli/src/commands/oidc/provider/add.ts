import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'
const inquirer = require('inquirer')
const { error, warn, context, info, filterQuestions, mergeFlags } = require('../../../lib/tools')
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
    }
    // *********************

    // ***** QUESTIONS *****
    static questions = []
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Add)

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

        let targetResponse: any
        if (!flags.target) {
            targetResponse = await inquirer.prompt([
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
            ])
        }
        const target = flags.target ? flags.target : targetResponse.target

        let oidcResponses = await inquirer.prompt([
            {
                group: 'oidc',
                type: 'input',
                name: 'providerName',
                message: 'Enter a name for this provider:',
                when: (values: any) => {
                    return target == 'google'
                },
                validate: (value: any) => {
                    if (value.trim().length == 0) return `Mandatory field`
                    else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,10}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 10 characters)'
                    return true
                },
            },
            {
                group: 'oidc',
                type: 'input',
                name: 'jsonSecretPath',
                message: 'Enter the path to your Google JSON credentials file:',
                when: (values: any) => {
                    if (target == 'google') {
                        info(
                            `Download your Google OAuth JSON credentials file from your Google Cloud Console, and enter the path to this file now.`,
                            false,
                            true
                        )
                        context(
                            `Make sure you add all redirect URLs that you intend to use, including the "/oauth2/callback" section (ex. https://my-app-1.mydomain.com/oauth2/callback)`,
                            true,
                            true
                        )
                        context(`If you use this provider on a ingress with a different domain name, it will not work.`, true, false)
                    }
                    return target == 'google'
                },
                validate: (value: any) => {
                    if (value.trim().length == 0) return `Mandatory field`
                    if (!fs.existsSync(value)) {
                        return 'File not found'
                    }
                    if (!value.toLowerCase().endsWith('.json')) {
                        return 'Expect a JSON file'
                    }
                    return true
                },
            },
        ])
        oidcResponses.target = target

        if (oidcResponses.target == 'keycloak client') {
            // Get client id & uuid
            let clientResponse
            try {
                clientResponse = await this.collectClientId(flags, 'Select a Client ID')
            } catch (err) {
                this.showError(err)
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
            } catch (err) {
                CliUx.ux.action.stop('error')
                this.showError(err)
                process.exit(1)
            }
        } else if (oidcResponses.target == 'google') {
            const authJsonText = fs.readFileSync(oidcResponses.jsonSecretPath, { encoding: 'utf8', flag: 'r' })
            let authJson = null
            try {
                authJson = JSON.parse(authJsonText)
            } catch (err) {}
            // Create new client in Keycloak
            CliUx.ux.action.start('Creating Google OIDC provider')
            try {
                await this.api(`oidc-provider`, 'post', {
                    type: 'google',
                    data: {
                        name: `google-${oidcResponses.providerName}`,
                        googleClientId: authJson.web.client_id,
                        googleClientSecret: authJson.web.client_secret,
                        redirectUris: authJson.web.redirect_uris,
                    },
                })
                CliUx.ux.action.stop()
            } catch (err) {
                CliUx.ux.action.stop('error')
                this.showError(err)
                process.exit(1)
            }
        } else {
            warn(`OIDC provider "${oidcResponses.target}" not implemented yet`)
            process.exit(1)
        }
    }
}
