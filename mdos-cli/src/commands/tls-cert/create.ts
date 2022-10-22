import { Flags, CliUx } from '@oclif/core'
const fs = require('fs')
const path = require('path')
import Command from '../../base'
const inquirer = require('inquirer')
const { error, filterQuestions, mergeFlags, info } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Create
 * @extends {Command}
 */
export default class Create extends Command {
    static aliases = []
    static description = 'Create a new ingress gateway'

    // ******* FLAGS *******
    static flags = {}
    // *********************

    // ***** QUESTIONS *****
    static questions = []
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Create)

        let agregatedResponses:any = {}

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Collect namespaces
        let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Collect tls secrets
        let tlsSecretResponse: { data: any[] }
        try {
            tlsSecretResponse = await this.api(`kube?target=tls-secrets&namespace=${agregatedResponses.namespace}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Select target namespace
        let response = await inquirer.prompt([
            {
                name: 'namespace',
                message: 'Select a namespace for which to create a certificate for',
                type: 'list',
                choices: nsResponse.data.map((o: { name: any }) => {
                    return { name: o.name }
                }),
            },
        ])
        agregatedResponses = {...agregatedResponses, ...response}

        // Certificate name
        response = await inquirer.prompt([
            {
                type: 'text',
                name: 'name',
                message: 'Enter a name for this certificate',
                validate: (value: any) => {
                    if (value.trim().length == 0) return `Mandatory field`
                    else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                    else if(tlsSecretResponse.data.find((secret: { metadata: { name: string } }) => secret.metadata.name.toLowerCase() == value.trim().toLowerCase()))
                        return 'Certificate name already exists'
                    return true
                },
            }
        ])
        agregatedResponses = {...agregatedResponses, ...response}

        // Use cert manager?
        response = await inquirer.prompt([
            {
                name: 'useCertManager',
                message: 'Use cert-manager to generate and manage your certificate, or provide it manually:',
                type: 'list',
                choices: [{
                    name: "Use Cert-Manager",
                    value: true
                }, {
                    name: "I already have a certificate",
                    value: false
                }],
            },
        ])
        agregatedResponses = {...agregatedResponses, ...response}

        agregatedResponses.hostnames = []

        // Use cert-manager
        if(agregatedResponses.useCertManager) {
            await this.addNewHost(agregatedResponses.hostnames)

            // Make sure we have a valid oauth2 cookie token
            // otherwise, collect it
            try {
                await this.validateJwt()
            } catch (error) {
                this.showError(error)
                process.exit(1)
            }

            // Collect issuers
            let issuerResponse:any = []
            try {
                issuerResponse = await this.api(`kube?target=cm-issuers`, 'get')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }

            // There are existing issuers already
            if(issuerResponse.data.length > 0) {
                const issuerValues = issuerResponse.data.map((issuer:any) => {
                    return {
                        name: `${issuer.metadata.name} (${issuer.kind})`,
                        value: issuer
                    }
                })
                issuerValues.push(new inquirer.Separator())
                issuerValues.push({
                    name: "I want to create a new Certificate Issuer",
                    value: "NEW"
                })
                const issResponse = await inquirer.prompt([
                    {
                        name: 'issuer',
                        message: 'What Cert-Manager issuer would you like to use:',
                        type: 'list',
                        choices: issuerValues,
                    },
                ])

                // Do not use existing, create new issuer
                if(issResponse.issuer == "NEW") {

                    // Issuer file path
                    response = await inquirer.prompt([
                        {
                            type: 'text',
                            name: 'issuerYamlPath',
                            message: 'Enter the path to your Issuer YAML file',
                            validate: (value: any) => {
                                if (value.trim().length == 0) return `Mandatory field`
                                else if (!fs.existsSync(value)) return 'File path does not exist'
                                else if (!value.toLowerCase().endsWith(".yaml") && !value.toLowerCase().endsWith(".yml")) return 'File is not a YAML file'
                                return true
                            },
                        }
                    ])
                    agregatedResponses = {...agregatedResponses, ...response}

                    // Create issuer now
                    await this.createIssuer(agregatedResponses)

                    // Then create certificate
                    await this.createCertificate(agregatedResponses)

                }
                // Use an existing issuer
                else {
                    agregatedResponses = {...agregatedResponses, ...issResponse}
                    await this.createCertificate(agregatedResponses)
                }
            }
        } 
        // Manually provide certificate
        else {
            // TODO
        }
    }

    /**
     * addNewHost
     * 
     * @param existingHosts 
     */
     async addNewHost(existingHosts: any[]) {
        const responses = await inquirer.prompt([{
            type: 'text',
            name: 'domain',
            message: 'Enter a target domain name (ex. frontend.mydomain.com or *.mydomain.com):',
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`
                else if(existingHosts.includes(value.trim().toLowerCase())) return `Domain name already added`
                return true
            },
        },
        {
            type: 'confirm',
            name: 'more',
            default: false,
            message: 'Would you like to add another domain name for this certificate request?',
        }])
        existingHosts.push(responses.domain)
        if(responses.more) {
            await this.addNewHost(existingHosts)
        }
    } 

    /**
     * createIssuer
     * @param agregatedResponses 
     */
    async createIssuer(agregatedResponses: any) {
        const issuerYaml = fs.readFileSync(agregatedResponses.issuerYamlPath, 'utf8')

        CliUx.ux.action.start('Creating Cert-Manager Issuer')
        try {
            await this.api(`kube`, 'post', {
                type: 'cm-issuer',
                namespace: agregatedResponses.namespace,
                issuerYaml: issuerYaml
            })
            CliUx.ux.action.stop()
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error)
            process.exit(1)
        }
    }

    /**
     * createCertificate
     * @param agregatedResponses 
     */
    async createCertificate(agregatedResponses: any) {

    }

    /**
     * createTlsSecret
     * @param agregatedResponses 
     */
    async createTlsSecret(agregatedResponses: any) {

    }
}