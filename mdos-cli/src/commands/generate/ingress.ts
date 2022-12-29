import { Flags } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { success, error, warn, context } = require('../../lib/tools')
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
    static aliases = ['add:ingress', 'ingress:add', 'ingress:generate']
    static description = 'Configure ingress rules to allow external access to your component ports using hostnames'

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

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        // Detect mdos project yaml file
        const appYamlPath = path.join(path.dirname(process.cwd()), 'mdos.yaml')
        if (!fs.existsSync(appYamlPath)) {
            error("You don't seem to be in a mdos component folder")
            process.exit(1)
        }

        // Load mdos yaml file
        let appYaml: any
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

        type Ingress = {
            name: string
            matchHost: string
            targetPort: number
            trafficType: string
            subPath?: string
            tlsSecretName?: string
        }

        // Update ingress
        if (!targetCompYaml.ingress) targetCompYaml.ingress = []

        let allResponses: any = {}
        let responsesBase = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Enter a name for the ingress:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if (!/^[a-z]+[a-z0-9\-]{2,20}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash characters are allowed (between 2 - 20 characters)'
                    return true
                },
            },
            {
                type: 'input',
                name: 'host',
                message: 'What domain name do you want to use to access your component:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
            {
                type: 'confirm',
                name: 'useSubPath',
                default: false,
                message: 'Do you want to match a subpath for this root domain name (fan-out)?',
            },
            {
                type: 'input',
                name: 'subPath',
                when: (values: any) => {
                    return values.useSubPath
                },
                message: 'Enter subpath (ex. /frontend):',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
        ])
        allResponses = { ...responsesBase }

        // Select target service port
        let createNewService = false
        if (targetCompYaml.services && targetCompYaml.services.length > 0) {
            const allPortsArray = targetCompYaml.services.map((s: { ports: any }) => s.ports).flat()
            const servicePortSelect = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'port',
                    message: 'What service target port should this traffic be redirected to?',
                    choices: [
                        ...allPortsArray.map((p: { port: any }) => {
                            return { name: p.port, value: p.port }
                        }),
                        ...[new inquirer.Separator(), { name: 'Declare a different port for this ingress', value: '__NEW__' }],
                    ],
                },
            ])
            if (servicePortSelect.port == '__NEW__') createNewService = true
            else allResponses.port = servicePortSelect.port
        } else {
            context('There are no services declared for this component. You need to create a service for this ingress.')
            createNewService = true
        }

        // Need a new service for this ingress
        if (createNewService) {
            let port
            let svcname: any
            let serviceResponses = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'port',
                    message: 'Specify a port number on which your application needs to be accessible on for your ingress:',
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
                {
                    type: 'input',
                    name: 'name',
                    message: 'Enter a name for the new service:',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        else if (!/^[a-z]+[a-z0-9\-]{2,20}$/.test(value))
                            return 'Invalid value, only alpha-numeric and dash characters are allowed (between 2 - 20 characters)'
                        return true
                    },
                },
            ])
            port = parseInt(serviceResponses.port)
            svcname = serviceResponses.name

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
            allResponses.port = port
        }

        // Now wrap up the remaining questions
        let responsesFinalize = await inquirer.prompt([
            {
                type: 'list',
                name: 'type',
                message: 'What type of traffic will this ingress use?',
                when: (values: any) => {
                    // If in framework mode, do not show this question
                    if (this.getConfig('FRAMEWORK_ONLY')) return false

                    context(
                        'NOTE: Make sure you have configured your namespace specific "Ingress Gateway" to handle this domain name and traffic type (HTTP and/or HTTPS).',
                        false,
                        true
                    )
                    context(
                        'For further details, refer to the documentation available here: https://mdundek.github.io/mdos/advanced-resources/#managing-your-domain-specific-ingress-gateways.',
                        false,
                        true
                    )
                    context(
                        'If your application requires that a dedicated certificate is available inside your POD (versus terminating the TLS connection on the gateway), then specify HTTPS here.',
                        true,
                        false
                    )
                    return true
                },
                choices: [
                    {
                        name: 'http',
                    },
                    {
                        name: 'https',
                    },
                ],
            },
        ])
        allResponses = { ...allResponses, responsesFinalize }

        // If in Framework mode, we need to ask about TLS certificates
        if (this.getConfig('FRAMEWORK_ONLY')) {
            // Gateway type
            const responseFrameworkMode = await inquirer.prompt({
                type: 'list',
                name: 'trafficType',
                message: 'What type of traffic are you intending to enforce for this config?',
                choices: [
                    {
                        name: 'HTTP (Listen on port 80, forwards to port 80)',
                        value: 'HTTP',
                    },
                    {
                        name: 'HTTPS, pass-through (Listen on port 443, forwards to port 443)',
                        value: 'HTTPS_PASSTHROUGH',
                    },
                    {
                        name: 'HTTPS, terminate TLS (Listen on port 443, forwards to port 80)',
                        value: 'HTTPS_SIMPLE',
                    },
                ],
            })
            allResponses.trafficType = responseFrameworkMode.trafficType

            if (allResponses.trafficType == 'HTTPS_SIMPLE') {
                // Collect tls secrets
                let tlsSecretResponse: { data: any[] }
                try {
                    tlsSecretResponse = await this.api(`kube?target=tls-secrets&namespace=${appYaml.tenantName}`, 'get')
                } catch (err) {
                    this.showError(err)
                    process.exit(1)
                }
                if (tlsSecretResponse.data.length == 0) {
                    error('There are no TLS Secrets available in this namespace. Did you create a certificate in this namespace first?')
                    process.exit(1)
                }

                const responseTlsSecret = await inquirer.prompt({
                    type: 'list',
                    name: 'tlsSecretName',
                    message: 'What TLS secret holds your certificate and key data for this domain?',
                    choices: tlsSecretResponse.data.map((secret: any) => {
                        return {
                            name: secret.metadata.name,
                            value: secret.metadata.name,
                        }
                    }),
                })
                allResponses = { ...allResponses, ...responseTlsSecret }
            }

            const ing: Ingress = {
                name: allResponses.name,
                matchHost: allResponses.host,
                targetPort: allResponses.port,
                trafficType: allResponses.trafficType,
            }
            if (allResponses.trafficType == 'HTTPS_SIMPLE') ing.tlsSecretName = allResponses.tlsSecretName
            if (allResponses.subPath) ing.subPath = allResponses.subPath

            targetCompYaml.ingress.push(ing)
        } else {
            const ing: Ingress = {
                name: allResponses.name,
                matchHost: allResponses.host,
                targetPort: allResponses.port,
                trafficType: allResponses.type,
            }

            if (allResponses.subPath) ing.subPath = allResponses.subPath

            targetCompYaml.ingress.push(ing)
        }

        appYaml.components = appYaml.components.map((comp: any) => (comp.name == compName ? targetCompYaml : comp))

        // Create mdos.yaml file
        try {
            fs.writeFileSync(appYamlPath, YAML.stringify(appYaml))
            success('mdos.yaml file was updated')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
    }
}
