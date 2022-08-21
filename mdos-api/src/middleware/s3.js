const axios = require('axios')
const https = require('https')
const YAML = require('yaml')
const fs = require('fs')
const path = require('path')
const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')
const { terminalCommand } = require('../libs/terminal')
const { isBuffer } = require('util')
const { nanoid } = require('nanoid')

axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
})

class S3 {
    /**
     * constructor
     * @param {*} app
     */
    constructor(app) {
        this.app = app

        this.s3Provider = process.env.S3_PROVIDER
    }

    /**
     * createNamespaceBucket
     */
    async createNamespaceBucket(namespace) {
        if (this.s3Provider == 'minio') {
            // Make sure admin alias is created
            const aliases = await terminalCommand(`mc alias list --json`)
            if(!aliases.find(a => JSON.parse(a).alias == "mdosminion")){
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
                readCredentials
            }
        }
    }

    /**
     * deleteNamespaceBucket
     * @param {*} namespace 
     */
    async deleteNamespaceBucket(namespace) {
        if (this.s3Provider == 'minio') {
            // Make sure admin alias is created
            const aliases = await terminalCommand(`mc alias list --json`)
            if(!aliases.find(a => JSON.parse(a).alias == "mdosminion")){
                const keycloakSecret = await this.app.get('kube').getSecret('minio', 'minio')
                await terminalCommand(`mc config host add mdosminio ${process.env.S3_HOST} ${keycloakSecret.rootUser} ${keycloakSecret.rootPassword}`)
            }

            // Delete bucket
            await terminalCommand(`mc rb --force mdosminio/${namespace}`)

            // Delete minio users and credentials & permissions
            let regCredsFound = await this.app.get('kube').hasSecret(namespace, `s3-read`);
            if (regCredsFound) {
                const creds = await this.app.get('kube').getSecret(namespace, `s3-read`);
                await terminalCommand(`mc admin user remove mdosminio ${creds.ACCESS_KEY}`)
                await this.app.get('kube').deleteSecret(namespace, `s3-read`)
            }
            await terminalCommand(`mc admin policy remove mdosminio ${namespace}-read`)

            regCredsFound = await this.app.get('kube').hasSecret(namespace, `s3-write`);
            if (regCredsFound) {
                const creds = await this.app.get('kube').getSecret(namespace, `s3-write`);
                await terminalCommand(`mc admin user remove mdosminio ${creds.ACCESS_KEY}`)
                await this.app.get('kube').deleteSecret(namespace, `s3-write`)
            }
            await terminalCommand(`mc admin policy remove mdosminio ${namespace}-write`)
        }
    }

    /**
     * storeNamespaceCredentials
     * @param {*} namespace 
     * @param {*} credentials 
     */
    async storeNamespaceCredentials(namespace, credentials) {
        if (this.s3Provider == 'minio') {
            credentials.readCredentials.S3_PROVIDER = "minio"
            credentials.readCredentials.S3_INTERNAL_HOST = "http://minio.minio.svc.cluster.local:9000"
            credentials.writeCredentials.S3_PROVIDER = "minio"
            credentials.writeCredentials.S3_INTERNAL_HOST = "http://minio.minio.svc.cluster.local:9000"
            await this.app.get('kube').createSecret(namespace, `s3-read`, credentials.readCredentials)
            await this.app.get('kube').createSecret(namespace, `s3-write`, credentials.writeCredentials)
        }
    }

    /**
     * getNamespaceCredentials
     * @param {*} namespace 
     * @param {*} permissions 
     */
    async getNamespaceCredentials(namespace, permissions) {
        if (this.s3Provider == 'minio') {
            const regCredsFound = await this.app.get('kube').hasSecret(namespace, `s3-${permissions}`);
            if (regCredsFound) {
                const creds = await this.app.get('kube').getSecret(namespace, `s3-${permissions}`);
                creds.host = process.env.S3_HOST;
                return creds;
            }
        }
        return null;
    }
}

module.exports = S3
