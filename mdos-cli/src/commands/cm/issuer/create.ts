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
    static aliases = []
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

        let agregatedResponses: any = {}

        // Select target namespace
        let response = await inquirer.prompt({
            type: 'list',
            name: 'issuerType',
            message: 'What type of issuer do you wish to create?',
            choices: [
                {
                    name: 'Issuer (Namespace scoped)',
                    value: 'Issuer',
                },
                {
                    name: 'ClusterIssuer (Cluster wide)',
                    value: 'ClusterIssuer',
                },
            ],
        })
        agregatedResponses = { ...agregatedResponses, ...response }

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        let issuerObject: { kind: string; metadata: { name: string } }

        // Issuer
        if (agregatedResponses.issuerType == 'Issuer') {
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
            response = await inquirer.prompt([
                {
                    name: 'namespace',
                    message: 'Select a namespace for which to create a issuer for:',
                    type: 'list',
                    choices: nsResponse.data.map((o: { name: any }) => {
                        return { name: o.name }
                    }),
                },
            ])
            agregatedResponses = { ...agregatedResponses, ...response }

            // Collect issuers
            let issuerResponse: any = []
            try {
                issuerResponse = await this.api(`kube?target=cm-issuers&namespace=${agregatedResponses.namespace}`, 'get')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }

            // Collect Issuer YAML
            issuerObject = await this.collectIssuerYaml(agregatedResponses)
            if (issuerObject.kind.toLowerCase() == 'clusterissuer') {
                error('Your YAML file is for a "ClusterIssuer", but you selected a "Issuer" as your target.')
                process.exit(1)
            }

            // Display Name
            if (issuerObject.metadata.name) {
                info(`${issuerObject.kind} name: ${issuerObject.metadata.name}`)
            } else {
                error('Your Issuer does not have a name.')
                process.exit(1)
            }

            // Make sure the issuer name does not already exist
            if (issuerResponse.data.find((issuer: any) => issuer.metadata.name.toLowerCase() == issuerObject.metadata.name.toLowerCase())) {
                error(`The Issuer name "${issuerObject.metadata.name}" already exists`)
                process.exit(1)
            }

            agregatedResponses.issuerName = issuerObject.metadata.name
        }
        // ClusterIssuer
        else {
            // Collect issuers
            let issuerResponse: any = []
            try {
                issuerResponse = await this.api(`kube?target=cm-cluster-issuers`, 'get')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }

            // Collect Issuer YAML
            issuerObject = await this.collectIssuerYaml(agregatedResponses)
            if (issuerObject.kind.toLowerCase() == 'issuer') {
                error('Your YAML file is for a "Issuer", but you selected a "ClusterIssuer" as your target.')
                process.exit(1)
            }

            // Display Name
            if (issuerObject.metadata.name) {
                info(`${issuerObject.kind} name: ${issuerObject.metadata.name}`)
            } else {
                error('Your Issuer does not have a name.')
                process.exit(1)
            }

            // Make sure the issuer name does not already exist
            if (issuerResponse.data.find((issuer: any) => issuer.metadata.name.toLowerCase() == issuerObject.metadata.name.toLowerCase())) {
                error(`The Issuer name "${issuerObject.metadata.name}" already exists`)
                process.exit(1)
            }

            agregatedResponses.issuerName = issuerObject.metadata.name
        }

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Create Issuer
        CliUx.ux.action.start('Creating issuer')
        try {
            await this.api(`kube`, 'post', {
                type: issuerObject.kind.toLowerCase() == 'issuer' ? 'cm-issuer' : 'cm-cluster-issuer',
                namespace: agregatedResponses.namespace ? agregatedResponses.namespace : null,
                issuerYaml: fs.readFileSync(agregatedResponses.issuerYamlPath, 'utf8'),
            })
            CliUx.ux.action.stop()
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error)
            process.exit(1)
        }
    }

    /**
     *
     */
    async collectIssuerYaml(agregatedResponses: any) {
        warn(
            `If your Issuer is not a "cert-manager" natively supported DNS01 provider (for more information, see: https://cert-manager.io/docs/configuration/acme/dns01/#supported-dns01-providers), and you intend on using an external "Webhook" provider to manage DNS01 challanges, then make sure you deployed this "Webhook" provider first before you continue.`
        )

        // Issuer file path
        let response = await inquirer.prompt([
            {
                type: 'input',
                name: 'issuerYamlPath',
                message: 'Enter the path to your Issuer YAML file:',
                validate: (value: any) => {
                    if (value.trim().length == 0) return `Mandatory field`
                    else if (!fs.existsSync(value)) return 'File path does not exist'
                    else if (!value.toLowerCase().endsWith('.yaml') && !value.toLowerCase().endsWith('.yml')) return 'File is not a YAML file'
                    return true
                },
            },
        ])
        agregatedResponses.issuerYamlPath = response.issuerYamlPath

        // Extract Issuer name
        const issuerYaml = fs.readFileSync(agregatedResponses.issuerYamlPath, 'utf8')
        let yamlBlockArray = issuerYaml.split('---')
        let issuer = null
        try {
            // Parse blocks and identify issuer
            for (let i = 0; i < yamlBlockArray.length; i++) {
                yamlBlockArray[i] = YAML.parse(yamlBlockArray[i])
                if (
                    yamlBlockArray[i].kind &&
                    (yamlBlockArray[i].kind == 'Issuer' || yamlBlockArray[i].kind == 'ClusterIssuer') &&
                    yamlBlockArray[i].metadata &&
                    yamlBlockArray[i].metadata.name
                ) {
                    issuer = yamlBlockArray[i]
                }
            }
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }
        if (!issuer) {
            error('The provided yaml file does not seem to be of kind "Issuer".')
            process.exit(1)
        }
        return issuer
    }
}
