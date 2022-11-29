import { Flags, CliUx } from '@oclif/core'
import { notEqual } from 'assert'
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')
import Command from '../../../base'
const inquirer = require('inquirer')
const { error, context, warn, filterQuestions, mergeFlags, info } = require('../../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Create
 * @extends {Command}
 */
export default class Create extends Command {
    static aliases = ['cm:certificate:create', 'cm:crt:create']
    static description = 'Create a new Certificate / TLS secret'

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

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if (this.getConfig('FRAMEWORK_ONLY')) {
            // Not supported in framework only mode
            error('This command is only available for MDos managed environements')
            process.exit(1)
        }

        let agregatedResponses: any = {}

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (err) {
            this.showError(err)
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
        if (nsResponse.data.length == 0) {
            error('No namespaces available. Did you create a new namespace yet (mdos ns create)?')
            process.exit(1)
        }

        // Select target namespace
        let response = await inquirer.prompt([
            {
                name: 'namespace',
                message: 'Select a namespace for which to create a certificate for:',
                type: 'list',
                choices: nsResponse.data.map((o: { name: any }) => {
                    return { name: o.name }
                }),
            },
        ])
        agregatedResponses = { ...agregatedResponses, ...response }

        // Collect tls secrets
        let tlsSecretResponse: { data: any[] }
        try {
            tlsSecretResponse = await this.api(`kube?target=tls-secrets&namespace=${agregatedResponses.namespace}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Collect Certificates
        let certificatesResponse: any = []
        try {
            certificatesResponse = await this.api(`kube?target=certificates&namespace=${agregatedResponses.namespace}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Certificate name
        response = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Enter a name for this certificate:',
                validate: (value: any) => {
                    if (value.trim().length == 0) return `Mandatory field`
                    else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                    else if (
                        tlsSecretResponse.data.find(
                            (secret: { metadata: { name: string } }) => secret.metadata.name.toLowerCase() == value.trim().toLowerCase()
                        ) ||
                        certificatesResponse.data.find(
                            (certificate: { metadata: { name: string } }) => certificate.metadata.name.toLowerCase() == value.trim().toLowerCase()
                        )
                    )
                        return 'Certificate name already exists'
                    return true
                },
            },
        ])
        agregatedResponses = { ...agregatedResponses, ...response }

        // Use cert manager?
        response = await inquirer.prompt([
            {
                name: 'useCertManager',
                message: 'Use cert-manager to generate and manage your certificate, or provide the certificate files manually:',
                type: 'list',
                choices: [
                    {
                        name: 'Use Cert-Manager',
                        value: true,
                    },
                    {
                        name: 'I already have a certificate',
                        value: false,
                    },
                ],
            },
        ])
        agregatedResponses = { ...agregatedResponses, ...response }

        agregatedResponses.hostnames = []

        // Use cert-manager
        if (agregatedResponses.useCertManager) {
            // Make sure we have a valid oauth2 cookie token
            // otherwise, collect it
            try {
                await this.validateJwt()
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }

            // Collect issuers & cluster issuers
            let issuerResponse: any = []
            try {
                issuerResponse = await this.api(`kube?target=cm-issuers&namespace=${agregatedResponses.namespace}`, 'get')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }
            let clusterIssuerResponse: any = []
            try {
                clusterIssuerResponse = await this.api(`kube?target=cm-cluster-issuers`, 'get')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }
            issuerResponse.data = issuerResponse.data
                .filter((issuer: any) => {
                    if (issuer.status)
                        return issuer.status.conditions.find((condition: any) => condition.status == 'True' && condition.type == 'Ready')
                            ? true
                            : false
                    else return false
                })
                .concat(
                    clusterIssuerResponse.data.filter((issuer: any) => {
                        if (issuer.status)
                            return issuer.status.conditions.find((condition: any) => condition.status == 'True' && condition.type == 'Ready')
                                ? true
                                : false
                        else return false
                    })
                )

            // There are existing issuers already
            if (issuerResponse.data.length == 0) {
                error('There are no Issuers / ClusterIssuers available. Create a new Issuer first and try again.')
                process.exit(1)
            }

            // Select target issuer / cluster issuer
            const issuerValues = issuerResponse.data.map((issuer: any) => {
                return {
                    name: `${issuer.metadata.name} (${issuer.kind})`,
                    value: issuer,
                }
            })

            const issResponse = await inquirer.prompt([
                {
                    name: 'issuer',
                    message: 'What Cert-Manager issuer would you like to use:',
                    type: 'list',
                    choices: issuerValues,
                },
            ])

            agregatedResponses.issuerName = issResponse.issuer.metadata.name
            agregatedResponses.isClusterIssuer = issResponse.issuer.kind == 'ClusterIssuer' ? true : false
            agregatedResponses = { ...agregatedResponses, ...issResponse }

            // Collect Hostnames / domain names for this certificate
            await this.addNewHost(agregatedResponses.hostnames)

            // Now generate certificate
            await this.createCertificate(agregatedResponses)
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
        const responses = await inquirer.prompt([
            {
                type: 'input',
                name: 'domain',
                message: 'Enter a target domain name (ex. frontend.mydomain.com or *.mydomain.com):',
                validate: (value: any) => {
                    if (value.trim().length == 0) return `Mandatory field`
                    else if (existingHosts.includes(value.trim().toLowerCase())) return `Domain name already added`
                    return true
                },
            },
            {
                type: 'confirm',
                name: 'more',
                default: false,
                message: 'Would you like to add another domain name for this certificate request?',
            },
        ])
        existingHosts.push(responses.domain)
        if (responses.more) {
            await this.addNewHost(existingHosts)
        }
    }

    /**
     * createCertificate
     * @param agregatedResponses
     */
    async createCertificate(agregatedResponses: any) {
        CliUx.ux.action.start('Creating certificate')
        try {
            await this.api(`kube`, 'post', {
                type: 'cm-certificate',
                name: agregatedResponses.name,
                namespace: agregatedResponses.namespace,
                hosts: agregatedResponses.hostnames,
                issuerName: agregatedResponses.issuerName,
                isClusterIssuer: agregatedResponses.isClusterIssuer,
            })
            CliUx.ux.action.stop()
        } catch (err) {
            CliUx.ux.action.stop('error')
            this.showError(err)
            process.exit(1)
        }
    }

    /**
     * createTlsSecret
     * @param agregatedResponses
     */
    async createTlsSecret(agregatedResponses: any) {}
}
