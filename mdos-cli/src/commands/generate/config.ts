import { Flags } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { error } = require('../../lib/tools')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

/**
 * Command
 *
 * @export
 * @class Config
 * @extends {Command}
 */
export default class Config extends Command {
    static aliases = [
        'add:configuration',
        'add:config',
        'add:conf',
        'add:env',
        'configuration:add',
        'config:add',
        'conf:add',
        'env:add',
        'generate:configuration',
        'generate:conf',
        'generate:env',
        'configuration:generate',
        'config:generate',
        'conf:generate',
        'env:generate'
    ]
    static description = 'Configure environement variables and config files for your components'

    // ******* FLAGS *******
    static flags = {}
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Config)

        // Detect mdos project yaml file
        const appYamlPath = path.join(path.dirname(process.cwd()), 'mdos.yaml')
        if (!fs.existsSync(appYamlPath)) {
            error("You don't seem to be in a mdos component folder")
            process.exit(1)
        }

        // Load mdos yaml file
        let appYaml: { components: any[] }
        try {
            appYaml = YAML.parse(fs.readFileSync(appYamlPath, 'utf8'))
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Identify component
        const compName = path.basename(process.cwd())
        const targetCompYaml = appYaml.components.find((c: { name: any }) => c.name == compName)
        if (!targetCompYaml) {
            error('Component not found in mdos.yaml file')
            process.exit(1)
        }

        // Collect data
        let responses = await inquirer.prompt([
            {
                type: 'string',
                name: 'name',
                message: 'Enter a name for this configuration asset:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                    return true
                },
            },
            {
                type: 'list',
                name: 'type',
                message: 'What type of config data do you wish to set up?',
                choices: [
                    {
                        name: 'environement variables',
                        value: 'env',
                    },
                    {
                        name: 'read only files',
                        value: 'file',
                    },
                ],
            },
            {
                type: 'string',
                name: 'mountpath',
                when: (values: any) => {
                    return values.type == 'file'
                },
                message: 'Enter the folder directory path in your container that you want to mount these config files into:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
        ])

        // Update configs
        if (!targetCompYaml.configs) targetCompYaml.configs = []

        type Config = {
            name: string
            type: string
            mountPath?: string
            entries: any
        }

        const env: Config = {
            name: responses.name,
            type: responses.type,
            entries: [],
        }

        if (responses.type == 'env') {
            env.entries.push({
                key: 'ENV_KEY',
                value: 'my value',
            })
        } else {
            env.mountPath = responses.mountpath
            env.entries.push({
                name: 'myconfig',
                filename: 'myfile.conf',
                value: 'some multinene config file\nmore lines here',
            })
        }

        targetCompYaml.configs.push(env)

        appYaml.components = appYaml.components.map((comp) => (comp.name == compName ? targetCompYaml : comp))

        // Create mdos.yaml file
        try {
            fs.writeFileSync(appYamlPath, YAML.stringify(appYaml))
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }
    }
}
