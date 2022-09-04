const axios = require('axios')
const https = require('https')
const YAML = require('yaml')
const fs = require('fs')
const path = require('path')
const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')
const { terminalCommand } = require('../libs/terminal')
const { isBuffer } = require('util')
const nanoid_1 = require('nanoid')
const nanoid = (0, nanoid_1.customAlphabet)('1234567890abcdefghijklmnopqrstuvwxyz', 10)

axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
})

/**
 * S3 specific functions
 *
 * @class S3
 */
class S3 {
    
    /**
     * Creates an instance of S3.
     * @param {*} app
     * @memberof S3
     */
    constructor(app) {
        this.app = app

        this.s3Provider = process.env.S3_PROVIDER
    }

    /**
     *
     *
     * @param {*} namespace
     * @return {*} 
     * @memberof S3
     */
    async createNamespaceBucket(namespace) {
        if (this.s3Provider == 'minio') {
            // Make sure admin alias is created
            const aliases = await terminalCommand(`mc alias list --json`)
            if (!aliases.find((a) => JSON.parse(a).alias == 'mdosminion')) {
                const keycloakSecret = await this.app.get('kube').getSecret('minio', 'minio')
                await terminalCommand(`mc config host add mdosminio ${process.env.S3_HOST} ${keycloakSecret.rootUser} ${keycloakSecret.rootPassword}`)
            }

            // Create bucket
            await terminalCommand(`mc mb mdosminio/${namespace} --ignore-existing`)

            // Create write policy for the bucket
            try {
                fs.writeFileSync(
                    './write.json',
                    JSON.stringify(
                        {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Action: ['s3:ListBucket', 's3:PutObject', 's3:GetObject', 's3:DeleteObject'],
                                    Effect: 'Allow',
                                    Resource: [`arn:aws:s3:::${namespace}/*`],
                                    Sid: '',
                                },
                            ],
                        },
                        null,
                        4
                    )
                )
                await terminalCommand(`mc admin policy add mdosminio ${namespace}-write ./write.json`)
            } finally {
                if (fs.existsSync('./write.json')) {
                    fs.unlinkSync('./write.json')
                }
            }

            // Create write policy for this bucket
            try {
                fs.writeFileSync(
                    './read.json',
                    JSON.stringify(
                        {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Action: ['s3:ListBucket', 's3:GetObject'],
                                    Effect: 'Allow',
                                    Resource: [`arn:aws:s3:::${namespace}/*`],
                                    Sid: '',
                                },
                            ],
                        },
                        null,
                        4
                    )
                )
                await terminalCommand(`mc admin policy add mdosminio ${namespace}-read ./read.json`)
            } finally {
                if (fs.existsSync('./read.json')) {
                    fs.unlinkSync('./read.json')
                }
            }

            // Create user creds write
            const writeCredentials = {
                ACCESS_KEY: nanoid(),
                SECRET_KEY: nanoid(),
            }
            await terminalCommand(`mc admin user add mdosminio ${writeCredentials.ACCESS_KEY} ${writeCredentials.SECRET_KEY}`)
            await terminalCommand(`mc admin policy set mdosminio ${namespace}-write user=${writeCredentials.ACCESS_KEY}`)

            // Create user creds read
            const readCredentials = {
                ACCESS_KEY: nanoid(),
                SECRET_KEY: nanoid(),
            }
            await terminalCommand(`mc admin user add mdosminio ${readCredentials.ACCESS_KEY} ${readCredentials.SECRET_KEY}`)
            await terminalCommand(`mc admin policy set mdosminio ${namespace}-read user=${readCredentials.ACCESS_KEY}`)

            return {
                writeCredentials,
                readCredentials,
            }
        }
    }

    /**
     *
     *
     * @param {*} namespace
     * @param {*} nsExists
     * @memberof S3
     */
    async deleteNamespaceBucket(namespace, nsExists) {
        if (nsExists == undefined || nsExists == null) {
            if (!(await this.app.get('kube').hasNamespace(namespace))) {
                nsExists = false
            } else {
                nsExists = true
            }
        }
        if (this.s3Provider == 'minio') {
            // Make sure admin alias is created
            const aliases = await terminalCommand(`mc alias list --json`)
            if (!aliases.find((a) => JSON.parse(a).alias == 'mdosminion')) {
                const keycloakSecret = await this.app.get('kube').getSecret('minio', 'minio')
                await terminalCommand(`mc config host add mdosminio ${process.env.S3_HOST} ${keycloakSecret.rootUser} ${keycloakSecret.rootPassword}`)
            }

            // Delete bucket
            await terminalCommand(`mc rb --force mdosminio/${namespace}`)

            // Delete minio users and credentials & permissions
            if (nsExists) {
                let regCredsFound = await this.app.get('kube').hasSecret(namespace, `s3-read`)
                if (regCredsFound) {
                    const creds = await this.app.get('kube').getSecret(namespace, `s3-read`)
                    await terminalCommand(`mc admin user remove mdosminio ${creds.ACCESS_KEY}`)
                    await this.app.get('kube').deleteSecret(namespace, `s3-read`)
                } else {
                    const allUserArray = await terminalCommand(`mc admin user list mdosminio --json`)
                    const u = allUserArray.find((uString) => JSON.parse(uString).policyName == `${namespace}-read`)
                    if (u) await terminalCommand(`mc admin user remove mdosminio ${JSON.parse(u).accessKey}`)
                }
                await terminalCommand(`mc admin policy remove mdosminio ${namespace}-read`)

                regCredsFound = await this.app.get('kube').hasSecret('minio', `${namespace}-s3-write`)
                if (regCredsFound) {
                    const creds = await this.app.get('kube').getSecret('minio', `${namespace}-s3-write`)
                    await terminalCommand(`mc admin user remove mdosminio ${creds.ACCESS_KEY}`)
                    await this.app.get('kube').deleteSecret('minio', `${namespace}-s3-write`)
                } else {
                    const allUserArray = await terminalCommand(`mc admin user list mdosminio --json`)
                    const u = allUserArray.find((uString) => JSON.parse(uString).policyName == `${namespace}-write`)
                    if (u) await terminalCommand(`mc admin user remove mdosminio ${JSON.parse(u).accessKey}`)
                }
                await terminalCommand(`mc admin policy remove mdosminio ${namespace}-write`)
            } else {
                const allMinioUsers = await terminalCommand(`mc admin user list mdosminio --json`)
                for (const minioUserStr of allMinioUsers) {
                    const minioUser = JSON.parse(minioUserStr)
                    if (minioUser.policyName == `${namespace}-write` || minioUser.policyName == `${namespace}-read`) {
                        await terminalCommand(`mc admin user remove mdosminio ${minioUser.accessKey}`)
                    }
                }
                await terminalCommand(`mc admin policy remove mdosminio ${namespace}-read`)
                await terminalCommand(`mc admin policy remove mdosminio ${namespace}-write`)
            }
        }
    }

    /**
     *
     *
     * @param {*} namespace
     * @param {*} credentials
     * @memberof S3
     */
    async storeNamespaceCredentials(namespace, credentials) {
        if (this.s3Provider == 'minio') {
            credentials.readCredentials.S3_PROVIDER = 'minio'
            credentials.readCredentials.S3_INTERNAL_HOST = 'http://minio.minio.svc.cluster.local:9000'
            await this.app.get('kube').createSecret(namespace, `s3-read`, credentials.readCredentials)

            credentials.writeCredentials.S3_PROVIDER = 'minio'
            credentials.writeCredentials.S3_INTERNAL_HOST = 'http://minio.minio.svc.cluster.local:9000'
            await this.app.get('kube').createSecret('minio', `${namespace}-s3-write`, credentials.writeCredentials)
        }
    }

    /**
     *
     *
     * @param {*} namespace
     * @param {*} permissions
     * @return {*} 
     * @memberof S3
     */
    async getNamespaceCredentials(namespace, permissions) {
        if (this.s3Provider == 'minio') {
            const tns = permissions == 'write' ? 'minio' : namespace
            const secretName = permissions == 'write' ? `${namespace}-s3-${permissions}` : `s3-${permissions}`
            const regCredsFound = await this.app.get('kube').hasSecret(tns, secretName)
            if (regCredsFound) {
                const creds = await this.app.get('kube').getSecret(tns, secretName)
                creds.host = process.env.S3_HOST
                return creds
            }
        }
        return null
    }
}

module.exports = S3
