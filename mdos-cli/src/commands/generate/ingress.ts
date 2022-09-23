import { Flags } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { error, warn } = require('../../lib/tools')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

/**
 * Command
 *
 * @export
 * @class Ingress
 * @extends {Command}
 */
export default class Ingress extends Command {
    static aliases = [
        'add:ingress',
        'ingress:add',
        'ingress:generate',
    ]
    static description = 'Configure ingress rules to allow external acces to your component ports using hostnames'

    // ******* FLAGS *******
    static flags = {
        hostname: Flags.string({ char: 'h', description: 'Ingress hostname' }),
        subpath: Flags.string({ char: 's', description: 'Ingress subpath match' }),
        port: Flags.string({ char: 'p', description: 'Target port' }),
        type: Flags.string({ char: 't', description: 'Traffic type (http, https, tcp/udp)' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Ingress)

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

        if (!targetCompYaml.services || targetCompYaml.services.length == 0) {
            warn('You have not declared any usable services for your application component')
            process.exit(1)
        }

        const allPortsArray = targetCompYaml.services.map((s: { ports: any }) => s.ports).flat()
        let oidcProviders: any

        let responses = await inquirer.prompt([
            {
                type: 'string',
                name: 'name',
                message: 'Enter a name for the ingress:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                    return true
                },
            },
            {
                type: 'string',
                name: 'host',
                message: 'What hostname do you want to use to access your component port:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
            {
                type: 'confirm',
                name: 'useSubPath',
                default: false,
                message: 'Do you want to match a subpath for this host?',
            },
            {
                type: 'string',
                name: 'subPath',
                when: (values: any) => {
                    return values.useSubPath
                },
                message: 'Enter subpath:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
            {
                type: 'list',
                name: 'port',
                message: 'What target port should this traffic be redirected to?',
                choices: allPortsArray.map((p: { port: any }) => {
                    return { name: p.port }
                }),
            },
            {
                type: 'list',
                name: 'type',
                message: 'What type of traffic will this ingress handle?',
                choices: [
                    {
                        name: 'http',
                    },
                    {
                        name: 'https',
                    },
                ],
            },
            {
                type: 'string',
                name: 'tlsKey',
                when: (values: any) => {
                    return values.type == 'https'
                },
                message: 'Enter the full path to your certificate key file:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if (!fs.existsSync(value)) return 'Invalid path'
                    return true
                },
            },
            {
                type: 'string',
                name: 'tlsCrt',
                when: (values: any) => {
                    return values.type == 'https'
                },
                message: 'Enter the full path to your certificate crt file:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if (!fs.existsSync(value)) return 'Invalid path'
                    return true
                },
            },
            {
                type: 'string',
                name: 'tldMountDir',
                when: (values: any) => {
                    return values.type == 'https'
                },
                message: 'Enter the container mount path for the certificate files:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
        ])

        // Update ingress
        if (!targetCompYaml.ingress) targetCompYaml.ingress = []

        type Ingress = {
            name: string
            matchHost: string
            targetPort: number
            trafficType: string
            subPath?: string
            tlsKeyPath?: string
            tlsCrtPath?: string
            tldMountPath?: string
        }

        const ing: Ingress = {
            name: responses.name,
            matchHost: responses.host,
            targetPort: responses.port,
            trafficType: responses.type,
        }

        if (responses.subPath) ing.subPath = responses.subPath

        if (responses.tlsKey) ing.tlsKeyPath = responses.tlsKey

        if (responses.tlsCrt) ing.tlsCrtPath = responses.tlsCrt

        if (responses.tldMountDir) ing.tldMountPath = responses.tldMountDir

        targetCompYaml.ingress.push(ing)

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
