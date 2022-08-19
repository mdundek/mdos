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
                await terminalCommand(`mc config host add mdosminio ${process.env.MINIO_HOST} ${keycloakSecret.rootUser} ${keycloakSecret.rootPassword}`)
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
                                    Resource: [`arn:aws:s3:::${namespace}/*", "arn:aws:s3:::${namespace}`],
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
                                    Resource: [`arn:aws:s3:::${namespace}/*", "arn:aws:s3:::${namespace}`],
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
                MINIO_ACCESS_KEY: nanoid(),
                MINIO_SECRET_KEY: nanoid(),
            }
            await terminalCommand(`mc admin user add mdosminio ${writeCredentials.MINIO_ACCESS_KEY} ${writeCredentials.MINIO_SECRET_KEY}`)
            await terminalCommand(`mc admin policy set mdosminio ${namespace}-write user=${writeCredentials.MINIO_ACCESS_KEY}`)

            // Create user creds read
            const readCredentials = {
                MINIO_ACCESS_KEY: nanoid(),
                MINIO_SECRET_KEY: nanoid(),
            }
            await terminalCommand(`mc admin user add mdosminio ${readCredentials.MINIO_ACCESS_KEY} ${readCredentials.MINIO_SECRET_KEY}`)
            await terminalCommand(`mc admin policy set mdosminio ${namespace}-read user=${readCredentials.MINIO_ACCESS_KEY}`)

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
                await terminalCommand(`mc config host add mdosminio ${process.env.MINIO_HOST} ${keycloakSecret.rootUser} ${keycloakSecret.rootPassword}`)
            }

            // Delete bucket
            await terminalCommand(`mc rb --force mdosminio/${namespace}`)
        }
    }

    /**
     * storeNamespaceCredentials
     * @param {*} namespace 
     * @param {*} credentials 
     */
    async storeNamespaceCredentials(namespace, credentials) {
        if (this.s3Provider == 'minio') {
            await this.app.get('kube').createSecret("minio", `${namespace}-read`, credentials.readCredentials)
            await this.app.get('kube').createSecret("minio", `${namespace}-write`, credentials.writeCredentials)
        }
    }

    /**
     * getNamespaceCredentials
     * @param {*} namespace 
     * @param {*} permissions 
     */
    async getNamespaceCredentials(namespace, permissions) {
        if (this.s3Provider == 'minio') {

        }
    }

    /**
     * deleteNamespaceCredentials
     * @param {*} namespace 
     */
    async deleteNamespaceCredentials(namespace) {
        if (process.env.S3_PROVIDER == 'minio') {
            await this.app.get('kube').deleteSecret("minio", `${namespace}-read`)
            await this.app.get('kube').deleteSecret("minio", `${namespace}-write`)
        }
    }
}

module.exports = S3
