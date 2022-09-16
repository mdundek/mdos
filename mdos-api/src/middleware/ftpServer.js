const axios = require('axios')
const https = require('https')

axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
})

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
        this.ftpApiDomain = process.env.FTP_DOMAIN_OVERWRITE && process.env.FTP_DOMAIN_OVERWRITE.length > 0 ? 
            process.env.FTP_DOMAIN_OVERWRITE : `mdos-ftp-api.${process.env.ROOT_DOMAIN}`
    }

    /**
     * _mdosFtpApiAuthenticate
     * @returns 
     */
    async _mdosFtpApiAuthenticate() {
        try {
            const token = await axios.post(
                `https://${this.ftpApiDomain}/authentication`,
                {
                    "strategy": "local",
                    "email": process.env.REG_USER,
                    "password": process.env.REG_PASS,
                },
                {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Host': `mdos-ftp-api.${process.env.ROOT_DOMAIN}`
                    },
                }
            )

            this.accessToken = token.data.accessToken;
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    /**
     * createFtpdCredentials
     * @param {*} tenantName 
     */
    async createFtpdCredentials(tenantName) {
        try {
            await this._mdosFtpApiAuthenticate();
            const credentials = await axios.post(
                `https://${this.ftpApiDomain}/credentials`,
                { tenantName },
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Host': `mdos-ftp-api.${process.env.ROOT_DOMAIN}`
                    },
                }
            )
            return credentials.data;
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    /**
     * removeFtpdCredentials
     * @param {*} tenantName 
     */
     async removeFtpdCredentials(tenantName) {
        try {
            await this._mdosFtpApiAuthenticate();
            await axios.delete(
                `https://${this.ftpApiDomain}/credentials/${tenantName}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Host': `mdos-ftp-api.${process.env.ROOT_DOMAIN}`
                    },
                }
            )
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}

module.exports = FtpServer