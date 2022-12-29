import { Flags } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { success, error } = require('../../lib/tools')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

/**
 * Command
 *
 * @export
 * @class Secret
 * @extends {Command}
 */
export default class Secret extends Command {
    static aliases = ['add:secret', 'secret:add', 'secret:generate']
    static description = 'Add a secrets to you components for sensitive environement variables and secret config files'

    // ******* FLAGS *******
    static flags = {}
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Secret)

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
        } catch (err) {
            this.showError(err)
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
                type: 'input',
                name: 'name',
                message: 'Enter a name for this new secret:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if (!/^[a-z]+[a-z0-9\-]{2,20}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash characters are allowed (between 2 - 20 characters)'
                    else if (targetCompYaml.secrets && targetCompYaml.secrets.find((c: any) => c.name.toUpperCase() == value.toUpperCase()))
                        return 'Secret name already defined'
                    return true
                },
            },
            {
                type: 'list',
                name: 'type',
                message: 'What type of secret data do you wish to set up?',
                choices: [
                    {
                        name: 'Environment variables',
                        value: 'env',
                    },
                    {
                        name: 'Read only files',
                        value: 'file',
                    },
                ],
            },
            {
                type: 'input',
                name: 'mountpath',
                when: (values: any) => {
                    return values.type == 'file'
                },
                message: 'Enter the folder directory path in your container that you want to mount these secret files into:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
            {
                name: 'useRef',
                message: 'Do you want to reference an existing Secret for this mount point?',
                type: 'confirm',
                default: false,
                when: (values: any) => {
                    return values.type == 'file' || values.type == 'dir'
                },
            },
            {
                type: 'input',
                name: 'ref',
                when: (values: any) => {
                    return values.useRef
                },
                message: 'Enter the Secret name to user:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
        ])

        // Update secrets
        if (!targetCompYaml.secrets) targetCompYaml.secrets = []

        type Secret = {
            name: string
            type: string
            mountPath?: string
            ref?: string
            entries?: any
        }

        const secret: Secret = {
            name: responses.name,
            type: responses.type,
        }

        if (!responses.useRef) {
            secret.entries = []
        } else {
            secret.ref = responses.ref
        }

        if (responses.type == 'env') {
            await this.collectSecretEnvVariables(responses.name, secret, targetCompYaml)
        } else if (!responses.useRef) {
            secret.mountPath = responses.mountpath
            secret.entries.push({
                key: 'mysecret',
                filename: 'myfile.conf',
                value: 'some multinene config file\nmore lines here',
            })
        }

        targetCompYaml.secrets.push(secret)

        appYaml.components = appYaml.components.map((comp) => (comp.name == compName ? targetCompYaml : comp))

        // Create mdos.yaml file
        try {
            fs.writeFileSync(appYamlPath, YAML.stringify(appYaml))
            success('mdos.yaml file was updated')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
    }

    /**
     * collectEnvVariables
     * @param name
     * @param targetCompYaml
     */
    async collectSecretEnvVariables(name: string, secret: any, targetCompYaml: any) {
        const iterate = async () => {
            let responses = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'key',
                    message: 'Enter secret environment variable name:',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        else if (!/[a-zA-Z0-9_]$/.test(value)) return 'Invalid value, only alpha-numeric and underscore characters are allowed'
                        else if (
                            targetCompYaml.secrets &&
                            targetCompYaml.secrets.find((c: any) => c.entries.find((e: any) => e.key.toLowerCase() == value.toLowerCase()))
                        )
                            return 'Variable already exists'
                        else if (
                            targetCompYaml.configs &&
                            targetCompYaml.configs.find((c: any) => c.entries.find((e: any) => e.key.toLowerCase() == value.toLowerCase()))
                        )
                            return 'Variable already exists'
                        else if (secret.entries.find((e: any) => e.key.toLowerCase() == value.toLowerCase())) return 'Variable already exists'
                        return true
                    },
                },
                {
                    type: 'input',
                    name: 'value',
                    message: 'Enter value:',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        return true
                    },
                },
            ])

            secret.entries.push(responses)

            let responsesMore = await inquirer.prompt({
                name: 'confirm',
                message: 'Do you want to configure another secret environment variable?',
                type: 'confirm',
                default: false,
            })
            if (responsesMore.confirm) await iterate()
        }
        await iterate()
    }
}
