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
export default class Delete extends Command {
    static aliases = []
    static description = 'Delete a Cert-Manager Issuers'

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
        const { flags } = await this.parse(Delete)

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if (this.getConfig('FRAMEWORK_ONLY')) {
            // Not supported in framework only mode
            error('This command is only available for MDos managed environements')
            process.exit(1)
        }

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
        // Make sure user has sufficient permissions for cluster issuers
        const jwtToken = await this.introspectJwt()

        // Collect Issuers
        let issuerResponse: any = []
        try {
            issuerResponse = await this.api(`kube?target=cm-issuers`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
        let clusterIssuerResponse: any = []
        if (
            jwtToken.resource_access.mdos &&
            (jwtToken.resource_access.mdos.roles.includes('admin') || jwtToken.resource_access.mdos.roles.includes('cm-cluster-issuer'))
        ) {
            try {
                clusterIssuerResponse = await this.api(`kube?target=cm-cluster-issuers`, 'get')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }
        }
        const allIssuers = [...issuerResponse.data, ...clusterIssuerResponse.data]

        // If no issuers, exit
        if (allIssuers.length == 0) {
            error('No issuers found')
            process.exit(1)
        }

        // Select Issuer to delete
        let responses = await inquirer.prompt([
            {
                type: 'list',
                name: 'issuer',
                message: 'Which Issuer do you wish to delete?',
                choices: allIssuers.map((issuer: any) => {
                    return {
                        name:
                            issuer.kind == 'Issuer'
                                ? `${issuer.metadata.namespace}/${issuer.metadata.name} (${issuer.kind})`
                                : `${issuer.metadata.name} (${issuer.kind})`,
                        value: issuer,
                    }
                }),
            },
            {
                name: 'confirm',
                message: 'You are about to delete this Issuer from your cluster. Do you wish to prosceed?',
                type: 'confirm',
                default: false,
            },
        ])

        // Delete
        if (responses.confirm) {
            CliUx.ux.action.start('Deleting Issuer')
            try {
                if (responses.issuer.kind == 'ClusterIssuer') {
                    await this.api(`kube/${responses.issuer.metadata.name}?target=cm-cluster-issuer`, 'delete')
                } else {
                    await this.api(
                        `kube/${responses.issuer.metadata.name}?target=cm-issuer&namespace=${responses.issuer.metadata.namespace}`,
                        'delete'
                    )
                }
                CliUx.ux.action.stop()
            } catch (err) {
                CliUx.ux.action.stop('error')
                this.showError(err)
                process.exit(1)
            }
        }
    }
}
