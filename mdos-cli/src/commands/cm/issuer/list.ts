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
    static description = 'List Cert-Manager Issuers'

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

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Collect Issuers
        let issuerResponse:any = []
        try {
            issuerResponse = await this.api(`kube?target=cm-issuers`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        let clusterIssuerResponse:any = []
        try {
            clusterIssuerResponse = await this.api(`kube?target=cm-cluster-issuers`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        console.log()
        CliUx.ux.table(
            [...issuerResponse.data, ...clusterIssuerResponse.data],
            {
                name: {
                    header: 'CERTIFICATE NAME',
                    minWidth: 30,
                    get: (row:any) => row.metadata.name,
                },
                namespace: {
                    header: 'NAMESPACE',
                    minWidth: 25,
                    get: (row:any) => row.metadata.namespace ? row.metadata.namespace : "none (ClusterIssuer)",
                },
                status: {
                    header: 'STATUS',
                    minWidth: 15,
                    get: (row:any) => row.status ? (row.status.conditions.find((condition:any) => condition.status == "True" && condition.type == "Ready") ? "Ready" : "Not ready") : "Not ready",
                },
                // message: {
                //     header: 'MESSAGE',
                //     minWidth: 10,
                //     get: (row:any) => {
                //         if(row.status) {
                //             const condition = row.status.conditions.find((condition:any) => condition.type == "Ready")
                //             return condition.message ? condition.message : ""
                //         } else {
                //             return "Pending"
                //         }
                //     },
                // }
            },
            {
                printLine: this.log.bind(this),
            }
        )
        console.log()
    }
}