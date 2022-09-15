// src/base.ts
import { Command, Config } from '@oclif/core'
const fs = require('fs')
const os = require('os')
const path = require('path')
const inquirer = require('inquirer')
const open = require('open')
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
    authMode: string
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
                "AUTH_MODE": "oidc",
                "OIDC_COOKIE": ""
              }, null, 4))
        }
        this.configData = JSON.parse(fs.readFileSync(this.configPath))
        this.authMode = this.configData['AUTH_MODE']
        if (!this.authMode) this.authMode = 'oidc'

        this.getConsoleLineHandel = getConsoleLineHandel
    }

    /**
     * initSocketIo
     */
    async initSocketIo() {
        const API_URI = this.checkIfDomainSet()
        let kcCookie = null
        if (this.authMode == 'oidc') {
            kcCookie = this.getConfig('OIDC_COOKIE')
        }
        this.socketManager = new SocketManager(API_URI, kcCookie)
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

        if (this.authMode == 'oidc') {
            const kcCookie = this.getConfig('OIDC_COOKIE')
            axiosConfig.headers = { Cookie: `_oauth2_proxy=${kcCookie};` }
        }
        axiosConfig.timeout = 1000 * 60 * 10

        // ------------------------- INJECT TOKEN FOR TESTING ----------------------
        // INFO: No need to try injevcting your own JWT token here in production mode,
        // it will not pass the OIDC authentication flow from OAuth2-proxy & Keycloak.
        // This mode should only be used for developement purposes and can not be
        // considered secure
        const authMode = this.checkIfAuthSet()
        if (!skipTokenInjection && authMode == 'api') {
            const token = this.getConfig('JWT_TOKEN')
            if (!token || token.length == 0) {
                error('User is not authenticated. Please login and try again')
                process.exit(1)
            }
            if (!axiosConfig.headers) axiosConfig.headers = {}
            axiosConfig.headers['x-auth-request-access-token'] = token
        }
        // -------------------------------------------------------------------------
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
     * checkIfAuthSet
     * 
     * @returns
     */
    checkIfAuthSet() {
        let AUTH_SET = this.getConfig('AUTH_MODE')
        if (!AUTH_SET) {
            error("Please set your mdos auth mode using the command 'mdos set auth-mode [oidc|api|none]'")
            process.exit(1);
        }
        return AUTH_SET
    }

    /**
     * _collectKeycloakUrl
     *
     * @returns
     */
    async _collectKeycloakUrl() {
        let KC_URI = this.getConfig('MDOS_KC_URI')
        if (!KC_URI) {
            const responses = await inquirer.prompt([
                {
                    type: 'text',
                    name: 'kcUrl',
                    message: 'Please enter the Keycloak base URL:',
                    validate: async (value: { trim: () => { (): any; new (): any; length: number } }) => {
                        if (value.trim().length == 0) {
                            return 'Mandatory field'
                        }
                        try {
                            await axios.get(`${value}`, { timeout: 2000 })
                            return true
                        } catch (error) {
                            return 'URL does not seem to be valid'
                        }
                    },
                },
            ])
            KC_URI = responses.kcUrl

            this.setConfig('MDOS_KC_URI', KC_URI)
        }
        return KC_URI
    }

    /**
     * validateJwt
     */
    async validateJwt() {
        if (this.authMode == 'none') return

        let API_URI = this.checkIfDomainSet()
        let KC_URI = await this._collectKeycloakUrl()

        KC_URI = KC_URI.startsWith('http://') || KC_URI.startsWith('https://') ? KC_URI.substring(KC_URI.indexOf('//') + 2) : KC_URI

        const authMode = this.checkIfAuthSet()
        if (authMode == 'oidc') {
            const _validateCookie = async (takeNoAction?: boolean) => {
                const testResponse = await this.api('jwt', 'get', true)
                if (testResponse.request.host == KC_URI) {
                    if (takeNoAction) {
                        return false
                    } else {
                        // token expired
                        this.setConfig('OIDC_COOKIE', null)
                        warn('Your current token has expired or is invalid. You need to re-authenticate')
                        await this.validateJwt()
                    }
                } else {
                    if (takeNoAction) {
                        return true
                    }
                }
            }

            const kcCookie = this.getConfig('OIDC_COOKIE')
            if (!kcCookie || kcCookie.length == 0) {
                await open(`${API_URI}/jwt`)

                await inquirer.prompt([
                    {
                        type: 'text',
                        name: 'jwtToken',
                        message: 'Please enter the JWT token now once you successfully authenticated yourself:',
                        validate: async (value: { trim: () => { (): any; new (): any; length: number } }) => {
                            if (value.trim().length == 0) {
                                return 'Mandatory field'
                            }
                            this.setConfig('OIDC_COOKIE', value)
                            const validTkn = await _validateCookie(true)
                            if (!validTkn) {
                                this.setConfig('OIDC_COOKIE', null)
                                return 'Invalid cookie'
                            }
                            return true
                        },
                    },
                ])
                console.log()
            } else {
                await _validateCookie()
            }
        } else {
            const token = this.getConfig('JWT_TOKEN')
            if (!token || token.length == 0) {
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

                const loginResponse = await this.api('direct-login', 'post', responses, true)
                if (loginResponse.data.error) {
                    error(loginResponse.data.error_description)
                    process.exit(1)
                }

                warn("API authentication is not secure, it is for developement purposes only")

                this.setConfig('JWT_TOKEN', loginResponse.data.access_token)
            }
        }
    }

    /**
     * logout
     */
    async logout() {
        await this.api('logout', 'get')
        this.setConfig('OIDC_COOKIE', '')
        this.setConfig('JWT_TOKEN', '')
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
