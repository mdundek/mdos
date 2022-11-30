import { Flags, CliUx } from '@oclif/core'
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')
import Command from '../../../base'
const inquirer = require('inquirer')
const { error, filterQuestions, mergeFlags, info } = require('../../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Create
 * @extends {Command}
 */
export default class List extends Command {
    static aliases = ['cm:certificate:list', 'cm:crt:list']
    static description = 'List your certificates'

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
        const { flags } = await this.parse(List)

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if (this.getConfig('FRAMEWORK_ONLY')) {
            // Not supported in framework only mode
            error('This command is only available for MDos managed cluster deployments')
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

        // Get client id & uuid
        let clientResponse
        try {
            clientResponse = await this.collectClientId(flags, 'Select a namespace for which to list certificate for:', true)
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
        agregatedResponses = { ...agregatedResponses, ...{ namespace: clientResponse.clientId } }

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

        console.log()
        CliUx.ux.table(
            certificatesResponse.data,
            {
                name: {
                    header: 'CERTIFICATE NAME',
                    minWidth: 25,
                    get: (row: any) => row.metadata.name,
                },
                namespace: {
                    header: 'NAMESPACE',
                    minWidth: 10,
                    get: (row: any) => row.metadata.namespace,
                },
                issuer: {
                    header: 'ISSUER NAME',
                    minWidth: 25,
                    get: (row: any) => row.spec.issuerRef.name,
                },
                status: {
                    header: 'STATUS',
                    minWidth: 15,
                    get: (row: any) =>
                        row.status
                            ? row.status.conditions.find((condition: any) => condition.status == 'True' && condition.type == 'Ready')
                                ? 'Ready'
                                : 'Not ready'
                            : 'Not ready',
                },
                message: {
                    header: 'MESSAGE',
                    minWidth: 10,
                    get: (row: any) => (row.status ? row.status.conditions.find((condition: any) => condition.type == 'Ready').message : ''),
                },
            },
            {
                printLine: this.log.bind(this),
            }
        )
        console.log()
        console.log()

        CliUx.ux.table(
            tlsSecretResponse.data,
            {
                name: {
                    header: 'TLS SECRET NAME',
                    minWidth: 35,
                    get: (row: any) => row.metadata.name,
                },
                namespace: {
                    header: 'NAMESPACE',
                    minWidth: 35,
                    get: (row: any) => row.metadata.namespace,
                },
            },
            {
                printLine: this.log.bind(this),
            }
        )
        console.log()
    }
}
