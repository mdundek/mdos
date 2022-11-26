import { Flags } from '@oclif/core'
import Command from '../base'
const { error, context } = require('../lib/tools')
const axios = require('axios')
const https = require('https')
const fs = require('fs')
const os = require("os");
const YAML = require('yaml')



/**
 * Command
 *
 * @export
 * @class InstallFramework
 * @extends {Command}
 */
export default class InstallFramework extends Command {
    static description = 'Install MDos framework to your kubernetes cluster'

    // ******* FLAGS *******
    static flags = {}
    kubeApiUrl: any
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(InstallFramework)
        
        // Authenticate axios
        this.prepAxiosForKubeAuth()

        const res = await axios.get(`${this.kubeApiUrl}/api/v1/namespaces`)
        console.log(res)
    }

    /**
     * prepAxiosForKubeAuth
     */
    prepAxiosForKubeAuth() {
        let kubeConfigPath = null

        // Build kubeconfig file location
        if (os.platform() === 'linux' || os.platform() === 'darwin') {
            kubeConfigPath = `${os.homedir()}/.kube/config`
        } else if (os.platform() === 'win32') {
            kubeConfigPath = `${os.homedir()}\.kube\config`
        } else {
            error('Unsupported platform')
            process.exit(1)
        }

        // Make sure it exists
        if (!fs.existsSync(kubeConfigPath)) {
            error('Kubeconfig file not found. Did you install and configure your kubeconfig file?')
            process.exit(1)
        }

        let kubeConfig:any
        let context:any
        let cluster:any
        let user:any
        try {
            // Load it
            const kubeConfigYaml = fs.readFileSync(kubeConfigPath, "utf-8")
            kubeConfig = YAML.parse(kubeConfigYaml)

            if(!kubeConfig['current-context'] || kubeConfig['current-context'].length == 0) {
                error('Kubeconfig has no default context set. Configure your kubeconfig file and try again')
                process.exit(1)
            }

            context = kubeConfig.contexts.find((c:any) => c.name == kubeConfig['current-context']).context
            cluster = kubeConfig.clusters.find((c:any) => c.name == context.cluster).cluster
            user = kubeConfig.users.find((u:any) => u.name == context.user).user
        } catch(err) {
            error('Could not parse kubeconfig file')
            process.exit(1)
        }

        // Now call API
        axios.defaults.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            cert: Buffer.from(user['client-certificate-data'], 'base64').toString('utf-8'),
            key: Buffer.from(user['client-key-data'], 'base64').toString('utf-8'),
        })

        this.kubeApiUrl = cluster.server
    }
}
