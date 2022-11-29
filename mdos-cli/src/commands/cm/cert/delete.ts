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
    static aliases = ['cm:certificate:delete', 'cm:crt:delete']
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

        // Collect namespaces
        let nsResponse
        try {
            nsResponse = await this.api(`kube?target=namespaces`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
        if (nsResponse.data.length == 0) {
            error('No namespaces found.')
            process.exit(1)
        }

        // Select target namespace
        let response = await inquirer.prompt([
            {
                name: 'namespace',
                message: 'Select a namespace from which to delete a certificate from:',
                type: 'list',
                choices: nsResponse.data.map((o: { name: any }) => {
                    return { name: o.name }
                }),
            },
        ])

        // Collect Certificates
        let certResponse: any = []
        try {
            certResponse = await this.api(`kube?target=certificates&namespace=${response.namespace}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // If no issuers, exit
        if (certResponse.data.length == 0) {
            error('No certificates found')
            process.exit(1)
        }

        // Make sure user has sufficient permissions
        // const jwtToken = await this.introspectJwt()

        // Select Certificate to delete
        let certTarget = await inquirer.prompt([
            {
                type: 'list',
                name: 'certificate',
                message: 'Which Certificate do you wish to delete?',
                choices: certResponse.data.map((cert: any) => {
                    return {
                        name: `${cert.metadata.name}`,
                        value: cert,
                    }
                }),
            },
            {
                name: 'confirm',
                message: 'You are about to delete this Certificate from your cluster. Do you wish to prosceed?',
                type: 'confirm',
                default: false,
            },
        ])

        // Delete
        if (certTarget.confirm) {
            CliUx.ux.action.start('Deleting Certificate')
            try {
                await this.api(
                    `kube/${certTarget.certificate.metadata.name}?target=certificate&namespace=${certTarget.certificate.metadata.namespace}`,
                    'delete'
                )
                CliUx.ux.action.stop()
            } catch (err) {
                CliUx.ux.action.stop('error')
                this.showError(err)
                process.exit(1)
            }
        }
    }
}
