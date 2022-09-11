const FtpSrv = require('ftp-srv');
const fs = require('fs');
const nanoid_1 = require('nanoid');
const path = require('path');
const nanoid = (0, nanoid_1.customAlphabet)('1234567890abcdefghijklmnopqrstuvwxyz', 10)

/**
 * FtpServer specific functions
 *
 * @class FtpServer
 */
 class FtpServer {

    /**
     * Creates an instance of FtpServer.
     * @param {*} app
     * @memberof Keycloak
     */
     constructor(app) {
        this.app = app;
        const ftpServOptions = {
            anonymous: false,
            pasv_min: parseInt(process.env.FTP_SERVER_PASV_PORT_START),
            pasv_max: parseInt(process.env.FTP_SERVER_PASV_PORT_END)
        };

        if (process.env.FTP_SERVER_TLS_KEY_PATH && process.env.FTP_SERVER_TLS_KEY_PATH.length > 0) {
            ftpServOptions.url = `ftps://0.0.0.0:${process.env.FTP_SERVER_MAIN_PORT}`;
            ftpServOptions.pasv_url = 'ftps://0.0.0.0';
            ftpServOptions.tls = {
                key: fs.readFileSync(process.env.FTP_SERVER_TLS_KEY_PATH, 'utf8'),
                cert: fs.readFileSync(process.env.FTP_SERVER_TLS_CERT_PATH, 'utf8'),
            };
            if (process.env.FTP_SERVER_TLS_CA_PATH && process.env.FTP_SERVER_TLS_CA_PATH.length > 0) {
                ftpServOptions.tls.ca = fs.readFileSync(process.env.FTP_SERVER_TLS_CA_PATH, 'utf8');
            }
        } else {
            ftpServOptions.url = `ftp://0.0.0.0:${process.env.FTP_SERVER_MAIN_PORT}`;
            ftpServOptions.pasv_url = 'ftp://0.0.0.0';
        }
        this.CRED_SESSIONS = []
        this.ftpServer = new FtpSrv(ftpServOptions);
    }

    /**
     * generateSessionCredentials
     * @param {*} namespace 
     * @param {*} appName 
     */
    generateSessionCredentials(namespace, appName) {
        const usr = nanoid()
        const pwd = nanoid()
        this.CRED_SESSIONS.push({
            username: usr,
            password: pwd,
            path: path.join(process.env.INBOX_ROOT_FOLDER, namespace, appName),
            credsTimeout: setTimeout(function(_usr) {
                this.CRED_SESSIONS = this.CRED_SESSIONS.filter(s => s.username != _usr)
            }.bind(this, usr), 1000 * 60)
        })
        
        return {
            username: usr,
            password: pwd,
            createdAt: new Date().toISOString(),
            protocol: (process.env.FTP_SERVER_TLS_KEY_PATH && process.env.FTP_SERVER_TLS_KEY_PATH.length > 0) ? "ftps" : "ftp",
            host: `ftp-server.${process.env.ROOT_DOMAIN}`,
            port: `${process.env.FTP_SERVER_MAIN_PORT}`
        }
    }

    /**
     * deleteNamespaceVolume
     * @param {
     } namespace 
     */
    deleteNamespaceVolume(namespace) {
        const targetPath = path.join(process.env.INBOX_ROOT_FOLDER, namespace);
        if(fs.existsSync(targetPath))
            fs.rmSync(targetPath, { recursive: true, force: true })
    }

    /**
     * startDispatch
     */
     start() {
        this.ftpServer.on('login', ({ username, password }, resolve, reject) => {
            const sessionCreds = this.CRED_SESSIONS.find(s => s.username == username && s.password == password)
            if (sessionCreds) {
                clearTimeout(sessionCreds.credsTimeout)
                sessionCreds.credsTimeout = setTimeout(function(_usr) {
                    this.CRED_SESSIONS = this.CRED_SESSIONS.filter(s => s.username != _usr)
                }.bind(this, username), 1000 * 60)
                this.CRED_SESSIONS = this.CRED_SESSIONS.map(session => session.username == username ? sessionCreds : session)
                return resolve({ root: sessionCreds.path });
            }
            return reject(new Error('Wrong username / password combination'));
        });

        this.ftpServer.listen().then(() => {
            console.log('FTP Server started!');
        });
    }
}

module.exports = FtpServer