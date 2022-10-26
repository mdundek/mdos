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
    static aliases = []
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

        // Collect tls secrets
        let tlsSecretResponse: { data: any[] }
        try {
            tlsSecretResponse = await this.api(`kube?target=tls-secrets&namespace=${agregatedResponses.namespace}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Collect Certificates
        let certificatesResponse:any = []
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
                    get: (row:any) => row.metadata.name,
                },
                issuer: {
                    header: 'ISSUER NAME',
                    minWidth: 25,
                    get: (row:any) => row.spec.issuerRef.name,
                },
                status: {
                    header: 'STATUS',
                    minWidth: 15,
                    get: (row:any) => row.status ? (row.status.conditions.find((condition:any) => condition.status == "True" && condition.type == "Ready") ? "Ready" : "Not ready") : "Not ready",
                },
                message: {
                    header: 'MESSAGE',
                    minWidth: 10,
                    get: (row:any) => row.status ? row.status.conditions.find((condition:any) => condition.type == "Ready").message : "",
                }
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
                    get: (row:any) => row.metadata.name,
                }
            },
            {
                printLine: this.log.bind(this),
            }
        )
        console.log()
    }
}