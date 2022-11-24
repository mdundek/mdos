import { Flags } from '@oclif/core'
import Command from '../../base'
import { customAlphabet } from 'nanoid'
const inquirer = require('inquirer')
const { error, warn } = require('../../lib/tools')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 5)

/**
 * Command
 *
 * @export
 * @class Component
 * @extends {Command}
 */
export default class Component extends Command {
    static aliases = ['generate:comp', 'gen:comp', 'create:component', 'create:comp']
    static description = 'Scaffold a new application component for the application in the current directory'

    // ******* FLAGS *******
    static flags = {
        name: Flags.string({ char: 'n', description: 'An application component name' }),
        networkPolicy: Flags.string({ char: 'p', description: 'Network Policy to apply to this component' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Component)

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        // Detect mdos project yaml file
        let appYamlPath = path.join(process.cwd(), 'mdos.yaml')
        if (!fs.existsSync(appYamlPath)) {
            appYamlPath = path.join(path.dirname(process.cwd()), 'mdos.yaml')
            if (!fs.existsSync(appYamlPath)) {
                error("You don't seem to be in a mdos project folder")
                process.exit(1)
            }
        }

        // Load mdos yaml file
        let appYaml
        try {
            appYaml = YAML.parse(fs.readFileSync(appYamlPath, 'utf8'))
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        let appRootPath = path.dirname(appYamlPath)

        // Collect basic data
        let mdosAppCompDir
        let responses
        if (!flags.name) {
            responses = await inquirer.prompt([
                {
                    group: 'component',
                    type: 'input',
                    name: 'name',
                    message: 'Enter a application component name:',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                            return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                        if (fs.existsSync(path.join(appRootPath, value))) {
                            return 'A folder with this name already exists for this project'
                        }
                        return true
                    },
                },
            ])
            mdosAppCompDir = path.join(appRootPath, responses.name)
        } else {
            // Make sure app folder does not exist yet
            mdosAppCompDir = path.join(appRootPath, flags.name)
            if (fs.existsSync(mdosAppCompDir)) {
                warn('A folder with this name already exists in the project directory')
                process.exit(1)
            }
        }
        const appName = flags.name ? flags.name : responses.name

        let npResponse
        if (!flags.networkPolicy) {
            npResponse = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'networkPolicy',
                    message: 'What network policy do you want to apply to this component:',
                    choices: [
                        {
                            name: 'none (All components can talk to this component, no protection)',
                            value: 'none',
                        },
                        {
                            name: 'private (No one can talk to this component)',
                            value: 'private',
                        },
                        {
                            name: 'limited (Only components belonging to this application can talk to this component)',
                            value: 'limited',
                        },
                        {
                            name: 'open (All application components in this tenant namespace can talk to this component)',
                            value: 'open',
                        },
                        {
                            name: 'custom (You can specify which components in what namespaces can talk to this component)',
                            value: 'custom',
                        },
                    ],
                },
            ])
        } else {
            if (!['none', 'private', 'limited', 'open', 'custom'].includes(flags.networkPolicy)) {
                error('Invalid NetworkPolicy, allowed values are private, limited, open or custom')
                process.exit(1)
            } else {
                npResponse = { networkPolicy: flags.networkPolicy }
            }
        }

        // Framework mode has no private registry, so let's investigate a bit further
        let publicRegResponses = null
        let responsePullSecret = null
        let registryResponse = null
        if(this.getConfig('FRAMEWORK_MODE')) {
            // Ask if image will be available on a public registry
            publicRegResponses = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'publicRegistry',
                    default: true,
                    message: 'Is the component image accessible publicly?',
                },
            ])

            if(!publicRegResponses.publicRegistry) {
                registryResponse = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'registry',
                        message: 'Enter the URL of your private registry:',
                        validate: (value: string) => {
                            if (value.trim().length == 0) return 'Mandatory field'
                            return true
                        },
                    },
                ])
            }

            // Ask if imagePullSecret is needed
            const pullSecretRegResponses = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'imagePullSecretNeeded',
                    default: false,
                    message: 'Does your target registry require authentication to pull images?',
                },
            ])
            if(pullSecretRegResponses.imagePullSecretNeeded) {
                // Collect imagepull secrets
                let pullSecretResponse: { data: any[] }
                try {
                    pullSecretResponse = await this.api(`kube?target=image-pull-secrets&namespace=${appYaml.tenantName}`, 'get')
                } catch (err) {
                    this.showError(err)
                    process.exit(1)
                }
                if (pullSecretResponse.data.length == 0) {
                    error('There are no Image-pull Secrets available in this namespace. Did you create a registry secret in this namespace first?')
                    process.exit(1)
                }

                responsePullSecret = await inquirer.prompt({
                    type: 'list',
                    name: 'pullSecretName',
                    message: 'What TLS secret holds your certificate and key data for this domain?',
                    choices: pullSecretResponse.data.map((secret: any) => {
                        return {
                            name: secret.metadata.name,
                            value: secret.metadata.name,
                        }
                    }),
                })

            }
        }

        // Create default Dockerfile
        try {
            fs.mkdirSync(mdosAppCompDir, { recursive: true })
            fs.writeFileSync(path.join(mdosAppCompDir, 'Dockerfile'), '# Populate your dockerfile for this component here\n')
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Generate basic app yaml data
        if (!appYaml.components) appYaml.components = []

        const compJson: any = {
            name: appName,
            image: `${appName}`,
            uuid: `${nanoid()}-${nanoid()}`,
            tag: '0.0.1',
        }

        if(this.getConfig('FRAMEWORK_MODE') && publicRegResponses.publicRegistry) compJson.publicRegistry = true
        if(this.getConfig('FRAMEWORK_MODE') && registryResponse)                  compJson.registry = registryResponse.registry
        if(this.getConfig('FRAMEWORK_MODE') && responsePullSecret)                compJson.imagePullSecrets = [{name: responsePullSecret.pullSecretName}]

        if (npResponse.networkPolicy != 'none') {
            compJson.networkPolicy = {
                scope: npResponse.networkPolicy,
            }
            if (npResponse.networkPolicy == 'custom') {
                compJson.networkPolicy.allow = []
            }
        }

        appYaml.components.push(compJson)

        // Create mdos.yaml file
        try {
            fs.writeFileSync(appYamlPath, YAML.stringify(appYaml))
        } catch (error) {
            this.showError(error)
            try {
                fs.rmdirSync(mdosAppCompDir, { recursive: true, force: true })
            } catch (_e) {}
            process.exit(1)
        }
    }
}
