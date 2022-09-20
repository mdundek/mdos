// src/base.ts
import { Command, Config } from '@oclif/core'
const fs = require('fs')
const os = require('os')
const path = require('path')
const inquirer = require('inquirer')
const https = require('https')
const axios = require('axios').default
const { info, error, warn, filterQuestions, extractErrorCode, extractErrorMessage, getConsoleLineHandel } = require('./lib/tools')
const SocketManager = require('./lib/socket.js')

type AxiosConfig = {
    timeout: number
    headers?: any,
    httpsAgent?: any
}

/**
 * oclif command base class
 *
 * @export
 * @abstract
 * @class
 * @extends {Command}
 */
export default abstract class extends Command {
    socketManager: any
    getConsoleLineHandel: any
    configPath: any
    configData: any

    /**
     * constructor
     *
     * @param argv
     * @param config
     */
    constructor(argv: string[], config: Config) {
        if (!fs.existsSync(path.join(os.homedir(), '.mdos'))) {
            fs.mkdirSync(path.join(os.homedir(), '.mdos'))
        }
        super(argv, config)

        this.configPath = path.join(os.homedir(), '.mdos', 'cli.json')
        if(!fs.existsSync(this.configPath)){
            fs.writeFileSync(this.configPath, JSON.stringify({
                "MDOS_KC_URI": "",
                "MDOS_API_URI": "",
                "ACCESS_TOKEN": ""
              }, null, 4))
        }
        this.configData = JSON.parse(fs.readFileSync(this.configPath))
        this.getConsoleLineHandel = getConsoleLineHandel
    }

    /**
     * initSocketIo
     */
    async initSocketIo() {
        const API_URI = this.checkIfDomainSet()
        let accessToken = this.getConfig('ACCESS_TOKEN')
        this.socketManager = new SocketManager(API_URI, accessToken)
    }

    /**
     * getConfig
     *
     * @param key
     * @returns
     */
    getConfig(key: any) {
        return this.configData[key]
    }

    /**
     * getConfig
     *
     * @param key
     * @returns
     */
    getAllConfigs() {
        return this.configData
    }

    /**
     * getConfig
     *
     * @param key
     * @param value
     */
    setConfig(key: any, value: any) {
        this.configData[key] = value
        fs.writeFileSync(this.configPath, JSON.stringify(this.configData, null, 4))
    }

    /**
     * api
     *
     * @param endpoint
     * @param method
     * @param body
     * @returns
     */
    async api(endpoint: string, method: string, body?: any, skipTokenInjection?: boolean) {
        const API_URI = this.checkIfDomainSet()

        // Set oauth2 cookie if necessary
        const axiosConfig: AxiosConfig = {
            timeout: 0,
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        }

        axiosConfig.headers = { Authorization: `Bearer ${this.getConfig('ACCESS_TOKEN')}` }
        axiosConfig.timeout = 1000 * 60 * 10

        if (method.toLowerCase() == 'post') {
            return await axios.post(`${API_URI}/${endpoint}`, body, axiosConfig)
        } else if (method.toLowerCase() == 'get') {
            return await axios.get(`${API_URI}/${endpoint}`, axiosConfig)
        } else if (method.toLowerCase() == 'delete') {
            return await axios.delete(`${API_URI}/${endpoint}`, axiosConfig)
        } else if (method.toLowerCase() == 'put') {
            return await axios.put(`${API_URI}/${endpoint}`, body, axiosConfig)
        }
    }

    /**
     * checkIfDomainSet
     *
     * @returns
     */
    checkIfDomainSet() {
        let API_URI = this.getConfig('MDOS_API_URI')
        if (!API_URI) {
            error("Please set your mdos domain name using the command 'mdos set domain <your domain here>'")
            process.exit(1);
        }
        return API_URI
    }

    /**
     * validateJwt
     */
    async validateJwt(skipAuthMsg?: boolean) {
        const _validateCookie = async (takeNoAction?: boolean) => {
            const testResponse = await this.api('token-introspect', 'post', { access_token: this.getConfig('ACCESS_TOKEN') }, true)

            if(testResponse.data.active) {
                if (takeNoAction) {
                    return true
                }
            } else {
                if (takeNoAction) {
                    return false
                } else {
                    // token expired
                    this.setConfig('ACCESS_TOKEN', null)
                    warn('Your current token has expired or is invalid. You need to re-authenticate')
                    await this.validateJwt(true)
                }
            }
        }

        const token = this.getConfig('ACCESS_TOKEN')
        if (!token || token.length == 0) {

            if(!skipAuthMsg)
                warn("Authentication required")

            const responses = await inquirer.prompt([
                {
                    type: 'text',
                    name: 'username',
                    message: 'Please enter your username:',
                    validate: async (value: { trim: () => { (): any; new (): any; length: number } }) => {
                        if (value.trim().length == 0) {
                            return 'Mandatory field'
                        }
                        return true
                    },
                },
                {
                    type: 'password',
                    name: 'password',
                    message: 'Please enter your password:',
                    validate: async (value: { trim: () => { (): any; new (): any; length: number } }) => {
                        if (value.trim().length == 0) {
                            return 'Mandatory field'
                        }
                        return true
                    },
                },
            ])

            const loginResponse = await this.api('authentication', 'post', { 
                "strategy": "keycloak", 
                "username": responses.username, 
                "password": responses.password
            }, true)
            if (loginResponse.data.error) {
                error(loginResponse.data.error_description)
                process.exit(1)
            }
            this.setConfig('ACCESS_TOKEN', loginResponse.data.access_token)
            console.log()
        } else {
            await _validateCookie()
        }
    }

    /**
     * logout
     */
    async logout() {
        await this.api('logout', 'get')
        this.setConfig('ACCESS_TOKEN', '')
    }

    /**
     * collectClientId
     *
     * @param flags
     */
    async collectClientId(flags: any, question: string) {
        // Get all realm Clients
        const clientResponse = await this.api('keycloak?target=clients&realm=mdos', 'get')
        if (clientResponse.data.length == 0) {
            error('There are no clients available, or you do not have sufficient permissions to retrieve available clients for this task')
            process.exit(1)
        }

        // Select target client
        let clientResponses: {
            clientId: any
            clientUuid: any
        }
        if (flags.clientId) {
            const targetClient = clientResponse.data.find((o: { clientId: string }) => o.clientId == flags.clientId)
            if (!targetClient) {
                error('Could not find client ID: ' + flags.clientId)
                process.exit(1)
            }
            clientResponses = { clientId: targetClient.clientId, clientUuid: targetClient.id }
        } else {
            clientResponses = await inquirer.prompt([
                {
                    name: 'clientUuid',
                    message: question,
                    type: 'list',
                    choices: clientResponse.data.map((o: { clientId: any; id: any }) => {
                        return { name: o.clientId, value: o.id }
                    }),
                },
            ])
            const targetClient = clientResponse.data.find((o: { id: any }) => o.id == clientResponses.clientUuid)
            clientResponses.clientId = targetClient.clientId
        }
        return clientResponses
    }

    /**
     * showError
     *
     * @param error
     */
    showError(err: (arg0: any) => void) {
        error(extractErrorMessage(err))
    }

    /**
     * isPositiveInteger
     *
     * @param str
     * @returns
     */
    isPositiveInteger(str: any) {
        if (typeof str !== 'string') {
            return false
        }
        const num = Number(str)
        if (Number.isInteger(num) && num > 0) {
            return true
        }
        return false
    }
}
