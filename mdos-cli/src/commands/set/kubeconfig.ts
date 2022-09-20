import { Flags } from '@oclif/core'
import Command from '../../base'
const path = require("path")
const os = require("os")
const fs = require("fs")
const { error, success } = require('../../lib/tools')
const { terminalCommand } = require('../../lib/terminal')

/**
 * Command
 *
 * @export
 * @class SetConfig
 * @extends {Command}
 */
export default class Kubeconfig extends Command {
    static aliases = []
    static description = 'Retrieve user kubeconfig file and set up'

    // ******* FLAGS *******
    static flags = {}
    
    // ******* ARGS *******
    static args = []

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Kubeconfig)
        const { args } = await this.parse(Kubeconfig)

        // Make sure kubectl is installed
        let kctlTargetPath = null;
        if(process.platform === "linux" || process.platform === "darwin") {
            let kc = await terminalCommand("command -v kubectl");
            if (kc.length == 0 || !kc.find((o: string | string[]) => o.indexOf("/kubectl") != -1)) {
                kctlTargetPath = path.join(require('os').homedir(), ".local", "bin", "kubectl");
            } else {
                kctlTargetPath = kc.find((o: string | string[]) => o.indexOf("/kubectl"));
            }
        } else {
            error("Windows is not supported yet for this command")
            process.exit(1);
        }

        let kubeCfgDir = path.join(require('os').homedir(), ".kube");
        let dotkubeExists = fs.existsSync(kubeCfgDir);
        if (!dotkubeExists) {  
            fs.mkdirSync(kubeCfgDir);
        }
                            
        // Make sure we have a valid oauth2 cookie token
        // otherwise, collect it
        try {
            await this.validateJwt()
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }

        // Get user certificate
        let nsResponse
        try {
            nsResponse = await this.api(`kube?target=kubeconfig`, 'get')
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Time to put it all together
        let certFolder = path.join(kubeCfgDir, `mdos-certificates`);
        if (!fs.existsSync(certFolder)){
            fs.mkdirSync(certFolder);
        }
        
        let userKeyPath = path.join(certFolder, nsResponse.data.user + ".key");
        let userCrtPath = path.join(certFolder, nsResponse.data.user + ".crt");
       
        if (fs.existsSync(userKeyPath)){
            fs.unlinkSync(userKeyPath);
        }
        if (fs.existsSync(userCrtPath)){
            fs.unlinkSync(userCrtPath);
        }

        fs.writeFileSync(userKeyPath, nsResponse.data.key, "utf-8");
        fs.writeFileSync(userCrtPath, nsResponse.data.crt, "utf-8");

        await terminalCommand(`cd ${kubeCfgDir} && ${kctlTargetPath} config --kubeconfig=config set-cluster mdos --server=https://${nsResponse.data.host} --insecure-skip-tls-verify=true`);
        await terminalCommand(`${kctlTargetPath} config set-credentials ${nsResponse.data.user} --client-certificate=${userCrtPath} --client-key=${userKeyPath} --embed-certs=true`);
        await terminalCommand(`${kctlTargetPath} config set-context ${nsResponse.data.user}_mdos --cluster=mdos --user=${nsResponse.data.user}`);
        await terminalCommand(`${kctlTargetPath} config use-context ${nsResponse.data.user}_mdos`);

        success("Kubectl certificate and context updated")
    }
}
