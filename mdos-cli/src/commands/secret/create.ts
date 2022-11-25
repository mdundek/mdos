import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const fs = require('fs')
const { error, filterQuestions, mergeFlags } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Create
 * @extends {Command}
 */
export default class Create extends Command {
    static aliases = []
    static description = 'Create a secret'

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

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        if(!this.getConfig('FRAMEWORK_MODE')) {
            // Make sure we have a valid oauth2 cookie token
            // otherwise, collect it
            try {
                await this.validateJwt()
            } catch (error) {
                this.showError(error)
                process.exit(1)
            }
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
        let responses = await inquirer.prompt([
            {
                name: 'namespace',
                message: 'Select namespace for which you wish to create a Secret for:',
                type: 'list',
                choices: nsResponse.data.map((o: { name: any }) => {
                    return { name: o.name }
                }),
            },
            {
                name: 'type',
                message: 'What type of secret do you wish to create:',
                type: 'list',
                choices: [{
                    name: "Docker Config", value: "kubernetes.io/dockerconfigjson"
                }, {
                    name: "TLS (Certificate)", value: "kubernetes.io/tls"
                }],
            }
        ])
        agregatedResponses = { ...agregatedResponses, ...responses }

        let nsSecrets: { data: any[] }
        try {
            nsSecrets = await this.api(`kube?target=secrets&namespace=${agregatedResponses.namespace}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
        
        responses = await inquirer.prompt([
            {
                name: 'name',
                message: 'Enter your secret name:',
                type: 'input',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if(nsSecrets.data.find((s:any) => s.metadata.name.toLowerCase() == value.trim().toLowerCase())) return "Secret name already exists"
                    return true
                },
            },
        ])
        agregatedResponses = { ...agregatedResponses, ...responses }

        // docker config secret
        if(agregatedResponses.type == "kubernetes.io/dockerconfigjson") {
            responses = await inquirer.prompt([
                {
                    name: 'registry',
                    message: 'Enter your registry domain:',
                    type: 'input',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        return true
                    },
                },
                {
                    name: 'username',
                    message: 'Enter your registry username:',
                    type: 'input',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        return true
                    },
                },
                {
                    name: 'password',
                    message: 'Enter your registry password:',
                    type: 'input',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        return true
                    },
                },
            ])
            agregatedResponses = { ...agregatedResponses, ...responses }
        }
        // TLS secret
        else if(agregatedResponses.type == "kubernetes.io/tls") {
            responses = await inquirer.prompt([
                {
                    name: 'crt',
                    message: 'Enter the path to your certificate (crt) file:',
                    type: 'input',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        else if(!fs.existsSync(value)) return 'File not found'
                        return true
                    }
                },
                {
                    name: 'key',
                    message: 'Enter the path to your key file:',
                    type: 'input',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        else if(!fs.existsSync(value)) return 'File not found'
                        return true
                    }
                }
            ])

            responses.crt = fs.readFileSync(responses.crt, 'utf8')
            responses.key = fs.readFileSync(responses.key, 'utf8')

            agregatedResponses = { ...agregatedResponses, ...responses }
        }

        if(!this.getConfig('FRAMEWORK_MODE')) {
            // Make sure we have a valid oauth2 cookie token
            // otherwise, collect it
            try {
                await this.validateJwt()
            } catch (error) {
                this.showError(error)
                process.exit(1)
            }
        }

        console.log()
        if(agregatedResponses.type == 'kubernetes.io/tls') {
            CliUx.ux.action.start('Creating TLS secret')
            try {
                await this.api(`kube`, 'post', {
                    type: 'tls-secret',
                    namespace: agregatedResponses.namespace,
                    name: agregatedResponses.name,
                    data: {
                        "tls.crt": agregatedResponses.crt,
                        "tls.key": agregatedResponses.key,
                    }
                })
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
                this.showError(error)
                process.exit(1)
            }
        }
        else if(agregatedResponses.type == 'kubernetes.io/dockerconfigjson') {
            CliUx.ux.action.start('Creating Docker secret')
            try {

                const dockerAuthObj: any = {
                    auths: {}
                }
                dockerAuthObj.auths[agregatedResponses.registry] = {
                    "username": agregatedResponses.username,
                    "password": agregatedResponses.password,
                    "auth": Buffer.from(`${agregatedResponses.username}:${agregatedResponses.password}`, 'utf-8').toString('base64')
                }

                await this.api(`kube`, 'post', {
                    type: 'docker-secret',
                    namespace: agregatedResponses.namespace,
                    name: agregatedResponses.name,
                    data: {
                        ".dockerconfigjson": JSON.stringify(dockerAuthObj)
                    }
                })
                CliUx.ux.action.stop()
            } catch (error) {
                CliUx.ux.action.stop('error')
                this.showError(error)
                process.exit(1)
            }
        }
    }
}
