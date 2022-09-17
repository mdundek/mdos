const { terminalCommand, terminalCommandAsync } = require('../libs/terminal')
const fs = require('fs');
const nanoid_1 = require('nanoid');
const nanoid = (0, nanoid_1.customAlphabet)('1234567890abcdefghijklmnopqrstuvwxyz', 10)

/**
 * PureFtpDaemon specific functions
 *
 * @class PureFtpDaemon
 */
class PureFtpDaemon {
    
    /**
     * Creates an instance of PureFtpDaemon.
     * @param {*} app
     * @memberof PureFtpDaemon
     */
    constructor(app) {
        this.app = app
        this.CRED_SESSIONS = []
        if(process.env.RUNTIME != "local") {
            terminalCommandAsync(`bash /run.sh -c 3 -C 5 -l puredb:/etc/pure-ftpd/pureftpd.pdb -E -j -P ${process.env.PUBLICHOST} --daemonize`, (msg) => {
                console.log(msg);
            }, (err) => {
                console.log("ftpd error: ", err);
            }, () => {
                console.log("ftpd started!");
            })
        }
    }

    /**
     * createTenantCredentials
     * @returns 
     */
    async createTenantCredentials(tenantName) {
        try {
            const pwd = nanoid()
            
            await terminalCommand(`printf '${pwd}\n${pwd}\n' | pure-pw useradd ${tenantName} -f /etc/pure-ftpd/passwd/pureftpd.passwd -m -u ftpuser -d ${process.env.FTP_HOME_ROOT}/${tenantName}`)
            
            return {
                username: tenantName,
                password: pwd,
                protocol: (process.env.FTP_SERVER_TLS_KEY_PATH && process.env.FTP_SERVER_TLS_KEY_PATH.length > 0) ? "ftps" : "ftp",
                host: process.env.PUBLICHOST,
                port: `${process.env.FTP_SERVER_MAIN_PORT}`
            }
        } catch (error) {
            console.log(error);
            throw error
        }
    }

    /**
     * deleteTenantCredentials
     * @param {*} tenantName 
     */
    async deleteTenantCredentials(tenantName) {
        try {
            await terminalCommand(`pure-pw userdel ${tenantName} -f /etc/pure-ftpd/passwd/pureftpd.passwd -m`)
            fs.rmdirSync(
                `${process.env.FTP_HOME_ROOT}/${tenantName}`,
                { recursive: true, force: true }
            )
        } catch (error) {
            console.log(error);
        }
    }
}

module.exports = PureFtpDaemon
