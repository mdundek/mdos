import { Flags } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { info, warn, context, error } = require('../../lib/tools')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

/**
 * Command
 *
 * @export
 * @class Sso
 * @extends {Command}
 */
export default class Sso extends Command {
    static aliases = ['app:sso', 'app:protect', 'application:protect', 'sso:app', 'protect:app', 'protect:application']
    static description = 'Protect an ingress hostname'

    // ******* FLAGS *******
    static flags = {}
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Sso)

        // Detect mdos project yaml file
        let appYamlPath = path.join(process.cwd(), 'mdos.yaml')
        let componentName: any
        if (!fs.existsSync(appYamlPath)) {
            appYamlPath = path.join(path.dirname(process.cwd()), 'mdos.yaml')
            if (!fs.existsSync(appYamlPath)) {
                error("You don't seem to be in a mdos project folder")
                process.exit(1)
            }
            componentName = path.basename(process.cwd())
        }

        // Load mdos yaml file
        let appYaml: {
            oidc: any
            components: any[]
        }
        try {
            appYaml = YAML.parse(fs.readFileSync(appYamlPath, 'utf8'))
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Make sure not already declared
        if (!appYaml.components || appYaml.components.length == 0) {
            warn('You first need to set up a component with an ingress before enabeling OIDC SSO on it')
            process.exit(1)
        }

        let targetComponent: any

        // Make sure we are in valid component folder
        if (componentName) {
            targetComponent = appYaml.components.find((c) => c.name == componentName)
            if (!targetComponent) {
                error("You don't seem to be in a mdos component folder")
                process.exit(1)
            }
            if (!targetComponent.ingress) {
                error(
                    `The '${componentName}' component does not have a ingress configured yet. Please add an ingress to this component before adding SSO to it`
                )
                process.exit(1)
            }
        } else {
            // Collect candidate components
            const availComponents = []
            for (const component of appYaml.components) {
                if (component.ingress && component.ingress.length > 0) {
                    availComponents.push(component)
                }
            }
            // If none found
            if (availComponents.length == 0) {
                error(`There are no components available with an ingress configured.`)
                process.exit(1)
            }

            // If more than one found, ask which one to use
            if (availComponents.length > 1) {
                let cTarget = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'component',
                        message: 'Which component would you like to protect?',
                        choices: availComponents.map((c: { ingress: any; name: string }) => {
                            return { name: `${c.name} (${c.ingress.matchHost})`, value: c }
                        }),
                    },
                ])
                targetComponent = cTarget.component
            }
            // Only one found, use this one
            else {
                targetComponent = availComponents[0]
            }
        }

        const availHosts = (
            targetComponent.ingress
                ? targetComponent.ingress.filter((i: any) => {
                      if (targetComponent.oidc && targetComponent.oidc.hosts) {
                          return !targetComponent.oidc.hosts.find((h: any) => h == i.matchHost)
                      } else {
                          return true
                      }
                  })
                : []
        ).map((i: any) => i.matchHost)

        let targetHostname: any
        if (availHosts.length == 0) {
            error(`There are no ingress host names available to configure a SSO OIDC provider for.`)
            process.exit(1)
        } else if (availHosts.length > 1) {
            let hTarget = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'host',
                    message: 'Which hostname would you like to protect?',
                    choices: availHosts.map((c: any) => {
                        return { name: c }
                    }),
                },
            ])
            targetHostname = hTarget.host
        } else {
            targetHostname = availHosts[0]
        }

        context(`          Target component : ${targetComponent.name}`, false, true)
        context(`Target hostname to protect : ${targetHostname}`, true, false)

        // Make sure user is connected
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Collect OIDC target provider
        let oidcProviderName: any
        if (targetComponent && targetComponent.oidc) {
            oidcProviderName = targetComponent.oidc.provider
        } else {
            // Get available OIDC providers
            let oidcProviders: any
            try {
                oidcProviders = await this.api(`oidc-provider`, 'get')
            } catch (error) {
                this.showError(error)
                process.exit(1)
            }
            if (oidcProviders.data.length == 0) {
                error('No OIDC providers configured for this tenant, or you do not have sufficient permissions to see available OIDC providers')
                process.exit(1)
            }

            let oidcResponse = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'oidcProvider',
                    message: 'Select a OIDC provider to use:',
                    choices: async () => {
                        return oidcProviders.data.map((p: { name: any }) => {
                            return {
                                name: `${p.name}${p.name.indexOf('kc-') == 0 ? ' (Keycloak)' : ''}`,
                                value: p.name,
                            }
                        })
                    },
                },
            ])
            oidcProviderName = oidcResponse.oidcProvider
        }

        // Update oidc on component
        if (!targetComponent.oidc) {
            targetComponent.oidc = {
                provider: oidcProviderName,
                hosts: [targetHostname],
            }
        } else {
            targetComponent.oidc.hosts.push(targetHostname)
        }

        appYaml.components = appYaml.components.map((comp) => (comp.name == targetComponent.name ? targetComponent : comp))

        // Create mdos.yaml file
        try {
            fs.writeFileSync(appYamlPath, YAML.stringify(appYaml))
            info('SSO protection added successfully')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }
    }
}
