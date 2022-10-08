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
                    type: 'text',
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

        let npResponse;
        if (!flags.networkPolicy) {
            npResponse = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'networkPolicy',
                    message: 'What network policy do you want to apply to this component:',
                    choices: [
                        {
                            name: "none (All components can talk to this component, no protection)", 
                            value: "none"
                        },
                        {
                            name: "private (No one can talk to this component)", 
                            value: "private"
                        },
                        {
                            name: "limited (Only components belonging to this application can talk to this component)", 
                            value: "limited"
                        },
                        {
                            name: "open (All application components in this tenant namespace can talk to this component)", 
                            value: "open"
                        },
                        {
                            name: "custom (You can specify which components in what namespaces can talk to this component)", 
                            value: "custom"
                        }
                    ]
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

        const compJson:any = {
            name: appName,
            image: `${appName}`,
            uuid: `${nanoid()}-${nanoid()}`,
            tag: '0.0.1',
        }

        if(npResponse.networkPolicy != 'none') {
            compJson.networkPolicy = {
                scope: npResponse.networkPolicy
            }
            if(npResponse.networkPolicy == 'custom') {
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
