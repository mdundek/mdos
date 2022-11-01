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
export default class Create extends Command {
    static aliases = ["volume:create"]
    static description = 'Create a new shared volume'

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
        if (nsResponse.data.length == 0) {
            error('No namespaces available. Did you create a new namespace yet (mdos ns create)?')
            process.exit(1)
        }

        // Select target namespace
        let response = await inquirer.prompt([
            {
                name: 'namespace',
                message: 'Select namespace for which you wish to create a Shared Volume for:',
                type: 'list',
                choices: nsResponse.data.map((o: { name: any }) => {
                    return { name: o.name }
                }),
            },
        ])
        agregatedResponses = { ...agregatedResponses, ...response }

        let sharedVolumesResponse: { data: any[] }
        // Collect shared volumes
        try {
            sharedVolumesResponse = await this.api(`kube?target=shared-volumes&namespace=${agregatedResponses.namespace}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Collect name
        response = await inquirer.prompt({
            type: 'input',
            name: 'name',
            message: 'Enter a name for your Shared Volume:',
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`
                else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                    return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                return true
            },
        })
        agregatedResponses = { ...agregatedResponses, ...response }

        // Collect name
        response = await inquirer.prompt({
            type: 'input',
            name: 'size',
            message: 'What size do you want to allocate to this shared volume:',
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`
                else if (!/^([+-]?[0-9.]+)([eEinumkKMGTP]*[-+]?[0-9]*)$/.test(value)) return 'Invalid value'
                return true
            },
        })
        agregatedResponses = { ...agregatedResponses, ...response }
        
       

        // // Collect hostnames to configure for this server config
        // const hostList: string | any[] = []
        // await this.addNewHost(hostList)
        // agregatedResponses.hosts = hostList

        // // Check if hosts are available for configuration
        // let hostAvailableMatrix: any
        // try {
        //     hostAvailableMatrix = await this.api(`kube`, 'post', {
        //         type: 'validate-ingress-gtw-hosts',
        //         hosts: agregatedResponses.hosts,
        //         trafficType: agregatedResponses.trafficType,
        //     })
        // } catch (err) {
        //     this.showError(err)
        //     process.exit(1)
        // }

        // const unavailableHosts = agregatedResponses.hosts.filter((host: string) => !hostAvailableMatrix.data.available[host])
        // if (unavailableHosts.length > 0) {
        //     error('At least one of the domain hosts you configured is already configured on the cluster:')
        //     unavailableHosts.forEach((host: string) => {
        //         let gtw
        //         if (hostAvailableMatrix.data.matrix[host]['HTTPS_SIMPLE']) gtw = hostAvailableMatrix.data.matrix[host]['HTTPS_SIMPLE'].gtw
        //         else gtw = hostAvailableMatrix.data.matrix[host]['HTTPS_PASSTHROUGH'].gtw
        //         context(`${host}: Already configured on Gateway: "${gtw.metadata.namespace}/${gtw.metadata.name}"`, true, true)
        //     })
        //     process.exit(1)
        // }

        // if (agregatedResponses.trafficType == 'HTTP' || agregatedResponses.trafficType == 'HTTPS_PASSTHROUGH') {
        //     await this.generateGateway(agregatedResponses)
        // } else {
        

        //     await this.generateGateway(agregatedResponses)
        // }
    }
}
