import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { error, filterQuestions, mergeFlags, info } = require('../../lib/tools')

/**
 * Command
 *
 * @export
 * @class Create
 * @extends {Command}
 */
export default class Create extends Command {
    static aliases = []
    static description = 'Create a new ingress gateway'

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

        let agregatedResponses:any = {}

        // Collect gateway name
        let response = await inquirer.prompt({
            type: 'text',
            name: 'name',
            message: 'Enter a name for this new Ingress-Gateway:',
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`
                else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                    return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                return true
            },
        })
        agregatedResponses = {...agregatedResponses, ...response}

        // Collect hostname target type (wildcard or list)
        response = await inquirer.prompt({
            type: 'list',
            name: 'domainType',
            message: 'What type of domain name listener would you like to apply for this ingress gateway?',
            choices: [{
                name: "Wildcard domain - route traffic for all subdomains for a given root-domain (ex. *.mydomain.com)",
                value: "wildcard"
            }, {
                name: "List of one or more fully qualified domain names",
                value: "list"
            }],
        })
        agregatedResponses = {...agregatedResponses, ...response}

        // If wildcard
        await inquirer.prompt({
            when: () => {
                return agregatedResponses.domainType == "wildcard"
            },
            type: 'text',
            name: 'domain',
            message: 'Enter the root domain to configure for this Ingress Gateway (ex. *.mydomain.com):',
            validate: (value: any) => {
                if (value.trim().length == 0) return `Mandatory field`

                // Domain valid, save it now
                agregatedResponses.hosts = [value]

                return true
            },
        })

        // If domain list
        if(agregatedResponses.domainType == "list") {
            const hostList: string | any[] = []
            await this.addNewHost(hostList)
            agregatedResponses.hosts = hostList
        }

        // Gateway type
        response = await inquirer.prompt({
            type: 'list',
            name: 'gatewayType',
            message: 'What type of traffic type would you like to enforce with this gateway?',
            choices: [{
                name: "HTTP (Listen on port 80, forwards to port 80)",
                value: "HTTP"
            }, {
                name: "HTTPS, do not terminate TLS (Listen on port 443, forwards to port 443)",
                value: "HTTPS_PASSTHROUGH"
            }, {
                name: "HTTPS, terminate TLS on gateway (Listen on port 443, forwards to port 80)",
                value: "HTTPS_SIMPLE"
            }],
        })
        agregatedResponses = {...agregatedResponses, ...response}

        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }
        
        // Make sure hostnames are not already configured on the cluster
        const hostnameGwMatchesBuffer:any = {}
        for(const host of agregatedResponses.hosts) {
            // Get all gateways that have a matching hostname config
            let gtwResponse
            try {
                gtwResponse = await this.api(`kube?target=gateways&host=${host}`, 'get')
            } catch (err) {
                this.showError(err)
                process.exit(1)
            }

            // If maches found, check to see if there is already one with the gateway type we want configured for this hostname
            if(gtwResponse.data.length > 0) {
                hostnameGwMatchesBuffer[host] = gtwResponse.data
                const typeMatch = gtwResponse.data.find((gtw: any) => {
                    for(const server of gtw.spec.servers) {
                        if(agregatedResponses.gatewayType != "HTTP") {
                            if(server.tls && server.tls.mode == "SIMPLE" && agregatedResponses.gatewayType == "HTTPS_SIMPLE") {
                                return true
                            } else if(server.tls && server.tls.mode == "PASSTHROUGH" && agregatedResponses.gatewayType == "HTTPS_PASSTHROUGH") {
                                return true
                            }
                        } else {
                            if(server.http)
                                return true
                        }
                    }
                    return false                
                })
                if(typeMatch) {
                    error(`The host domain "${host}" already has an associated Gateway (${gtwResponse.data.metadata.name})`)
                    process.exit(1)
                }
            }
        }

        // If HTTP, go ahead and generate gateway
        if(agregatedResponses.gatewayType == "HTTP") {
            await this.generateHttpGateway(agregatedResponses)
            return // Exit, we are done
        }

        // Get matching certificates
        let crtResponse
        try {
            const myUrlWithParams = new URL("http://kube");
            myUrlWithParams.searchParams.append("target", "certificates");
            myUrlWithParams.searchParams.append("hosts", JSON.stringify(agregatedResponses.hosts));
            crtResponse = await this.api(`kube${myUrlWithParams.href.substring(myUrlWithParams.href.indexOf("?"))}`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        console.log(crtResponse.data)





        // // Globally, identify if PASSTHROUGH or SIMPLE already exists on cluster for those hostnames.
        // // No need to test all hostnames, if one of them had a conflicting existing gateway on the 
        // // server for the target type, we would not have gotten this far.
        // const passthroughTlsExistsAlready = hostnameGwMatchesBuffer[agregatedResponses.hosts[0]].find((gtw:any) => gtw.spec.servers.find((server:any) => server.tls && server.tls.mode == "PASSTHROUGH"))
        // const simpleTlsExistsAlready = hostnameGwMatchesBuffer[agregatedResponses.hosts[0]].find((gtw:any) => gtw.spec.servers.find((server:any) => server.tls && server.tls.mode == "SIMPLE"))

        // // If one or the other already configured
        // if(passthroughTlsExistsAlready || simpleTlsExistsAlready) {
        //     // If we requested a PASSTHROUGH Gateway, go ahead and create it because there is already a SIMPLE Gateway for the domain(s)
        //     // therefore we assume that there is already a certificate that exists and we can ignore it's lifecycle at this stage.
        //     if(agregatedResponses.gatewayType == "HTTPS_PASSTHROUGH") {
        //         info("There is already an existing Gateway for this domain(s) that has a TLS certificate configured. Certificate management is therefore skipped here for now.")
        //         await this.generateHttpsPassthroughGateway(agregatedResponses)
        //         return // Exit, we are done
        //     } else {
        //         // Is there a Cert-Manager Certificate object in the current namespace that is configured for all domain names?
        //     }
        // }





        // console.log(agregatedResponses)

        


        

        

       
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
     * generateHttpGateway
     * @param responses 
     */
    async generateHttpGateway(responses: any) {

    }

    /**
     * generateHttpsPassthroughGateway
     * @param responses 
     */
     async generateHttpsPassthroughGateway(responses: any) {

    }

    /**
     * generateHttpsSimple
     * @param responses 
     */
     async generateHttpsSimple(responses: any) {

    }
}