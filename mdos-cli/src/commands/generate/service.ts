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
 * @class Service
 * @extends {Command}
 */
export default class Service extends Command {
    static aliases = ['add:service', 'service:add', 'add:port', 'port:add', 'service:generate', 'generate:port', 'port:generate']
    static description = 'Expose ports for your application components so that other applications can communicate with your components'

    // ******* FLAGS *******
    static flags = {}
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Service)

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

        // Collect info
        let port
        let svcname: any

        let responses = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Enter a name for the service to add a port to:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                    return true
                },
            },
            {
                type: 'input',
                name: 'port',
                message: 'Specify a port number on which your application needs to be accessible on:',
                validate: (value: string) => {
                    if (value.trim().length < 2) return 'Invalid port'
                    if (this.isPositiveInteger(value)) {
                        return targetCompYaml.ports && targetCompYaml.ports.find((p: { port: number }) => p.port == parseInt(value))
                            ? 'Port already declared'
                            : true
                    } else {
                        return 'Invalid port'
                    }
                },
            },
        ])
        port = parseInt(responses.port)
        svcname = responses.name

        // Update ports
        if (!targetCompYaml.services) targetCompYaml.services = []

        const existingsvc = targetCompYaml.services.find((s: { name: any }) => s.name == svcname)
        if (existingsvc) {
            existingsvc.ports.push({
                port: port,
            })
        } else {
            targetCompYaml.services.push({
                name: svcname,
                ports: [
                    {
                        port: port,
                    },
                ],
            })
        }

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
