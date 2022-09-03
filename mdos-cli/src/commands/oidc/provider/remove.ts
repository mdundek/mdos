import { Flags, CliUx } from '@oclif/core'
import Command from '../../../base'
const inquirer = require('inquirer')
const { error, warn } = require('../../../lib/tools')

/**
 * Command
 */
export default class Remove extends Command {
    static aliases = ['oidc:delete', 'oidc:provider:delete', 'sso:delete', 'sso:provider:delete', 'sso:provider:remove']
    static description = 'Delete a deployed OIDC provider from the platform'

    // ******* FLAGS *******
    static flags = {
        name: Flags.string({ char: 'n', description: 'OIDC provider name' }),
        force: Flags.boolean({ char: 'f', description: 'Do not ask for comfirmation' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Remove)

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Get all providers
        let allProviders
        try {
            allProviders = await this.api(`oidc-provider`, 'get')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        if (allProviders.data.length == 0) {
            warn('There are no providers to delete')
            process.exit(1)
        }

        // Collect target provider
        let targetProvider
        if (flags.name) {
            targetProvider = allProviders.data.find((p: { name: string | undefined }) => p.name == flags.name)
            if (!targetProvider) {
                error('Provider not found')
                process.exit(1)
            }
        } else {
            const providerResponse = await inquirer.prompt([
                {
                    name: 'provider',
                    message: 'Select a provider to remove',
                    type: 'list',
                    choices: allProviders.data.map((o: { name: any }) => {
                        return { name: o.name, value: o }
                    }),
                },
            ])
            targetProvider = providerResponse.provider
        }

        // Confirm?
        let confirmed = false
        if (flags.force) {
            confirmed = true
        } else {
            const confirmResponse = await inquirer.prompt([
                {
                    name: 'confirm',
                    message: 'You are about to delete a OIDC provider, are you sure you wish to prosceed?',
                    type: 'confirm',
                    default: false,
                },
            ])
            confirmed = confirmResponse.confirm
        }

        if (confirmed) {
            CliUx.ux.action.start('Deleting Keycloak client')
            try {
                await this.api(`oidc-provider/${targetProvider.name}`, 'delete')
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
                this.showError(error)
                process.exit(1)
            }
        }
    }
}
