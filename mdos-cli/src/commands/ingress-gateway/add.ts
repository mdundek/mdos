import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { error, context, filterQuestions, mergeFlags, info } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Add
 * @extends {Command}
 */
export default class Add extends Command {
    static aliases = []
    static description = 'Add a new ingress gateway config'

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
        const { flags } = await this.parse(Add)

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
                message: 'Select namespace for which you wish to edit the Ingress Gateway for',
                type: 'list',
                choices: nsResponse.data.map((o: { name: any }) => {
                    return { name: o.name }
                }),
            },
        ])
        agregatedResponses = {...agregatedResponses, ...response}

        // Gateway type
        response = await inquirer.prompt({
            type: 'list',
            name: 'trafficType',
            message: 'What type of traffic are you intending to enforce for this config?',
            choices: [{
                name: "HTTP (Listen on port 80, forwards to port 80)",
                value: "HTTP"
            }, {
                name: "HTTPS, pass-through (Listen on port 443, forwards to port 443)",
                value: "HTTPS_PASSTHROUGH"
            }, {
                name: "HTTPS, terminate TLS (Listen on port 443, forwards to port 80)",
                value: "HTTPS_SIMPLE"
            }],
        })
        agregatedResponses = {...agregatedResponses, ...response}

        let tlsSecretResponse: { data: any[] }
        if(agregatedResponses.trafficType == "HTTPS_SIMPLE") {
            // Collect tls secrets
            try {
                tlsSecretResponse = await this.api(`kube?target=tls-secrets&namespace=${agregatedResponses.namespace}`, 'get')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }
            if(tlsSecretResponse.data.length == 0) {
                error("There are no TLS Secrets available in this namespace. Did you create a certificate in this namespace first?")
                process.exit(1)
            }
        } else {
            tlsSecretResponse = { data: [] }
        }

        // Collect hostnames to configure for this server config
        const hostList: string | any[] = []
        await this.addNewHost(hostList)
        agregatedResponses.hosts = hostList
        
        // Check if hosts are available for configuration
        let hostAvailableMatrix:any
        try {
            hostAvailableMatrix = await this.api(`kube`, 'post', {
                type: 'validate-ingress-gtw-hosts',
                hosts: agregatedResponses.hosts,
                trafficType: agregatedResponses.trafficType
            });
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        const unavailableHosts = agregatedResponses.hosts.filter((host: string) => !hostAvailableMatrix.data.available[host])
        if(unavailableHosts.length > 0) {
            error("At least one of the domain hosts you configured is already configured on the cluster:")
            unavailableHosts.forEach((host: string) => {
                let gtw
                if(hostAvailableMatrix.data.matrix[host]["HTTPS_SIMPLE"])
                    gtw = hostAvailableMatrix.data.matrix[host]["HTTPS_SIMPLE"].gtw
                else
                    gtw = hostAvailableMatrix.data.matrix[host]["HTTPS_PASSTHROUGH"].gtw
                context(`${host}: Already configured on Gateway: "${gtw.metadata.namespace}/${gtw.metadata.name}"`, true, true)
            })
            process.exit(1)
        }

        if(agregatedResponses.trafficType == "HTTP" || agregatedResponses.trafficType == "HTTPS_PASSTHROUGH") {
            await this.generateGateway(agregatedResponses)
        } else {
            response = await inquirer.prompt({
                type: 'list',
                name: 'tlsSecretName',
                message: 'What TLS secret holds your certificate and key data for these domains?',
                choices: tlsSecretResponse.data.map((secret:any) => {
                    return {
                        name: secret.metadata.name,
                        value: secret.metadata.name
                    }
                }),
            })
            agregatedResponses = {...agregatedResponses, ...response}

            await this.generateGateway(agregatedResponses)
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
            message: 'Enter a target domain name (ex. frontend.mydomain.com):',
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
            message: 'Would you like to add another domain name host to this Ingress Gateway?',
        }])
        existingHosts.push(responses.domain)
        if(responses.more) {
            await this.addNewHost(existingHosts)
        }
    }

    /**
     * generateGateway
     * @param responses 
     */
    async generateGateway(responses: any) {
        console.log()
        CliUx.ux.action.start('Creating ingress-gateway server config')
        try {
            await this.api(`kube`, 'post', {
                type: 'ingress-gateway',
                ...responses
            })
            CliUx.ux.action.stop()
        } catch (error) {
            CliUx.ux.action.stop('error')
            this.showError(error)
            process.exit(1)
        }
    }
}