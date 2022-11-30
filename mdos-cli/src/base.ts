// src/base.ts
import { Command, Config, CliUx } from '@oclif/core'
const fs = require('fs')
const os = require('os')
const path = require('path')
const inquirer = require('inquirer')
const https = require('https')
const axios = require('axios').default
const { info, error, warn, filterQuestions, extractErrorCode, extractErrorMessage, getConsoleLineHandel } = require('./lib/tools')
const SocketManager = require('./lib/socket.js')
const pjson = require('../package.json')
const chalk = require('chalk')

type AxiosConfig = {
    timeout: number
    headers?: any
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
        if (!fs.existsSync(this.configPath)) {
            fs.writeFileSync(
                this.configPath,
                JSON.stringify(
                    {
                        MDOS_API_URI: '',
                        FRAMEWORK_ONLY: '',
                    },
                    null,
                    4
                )
            )
        }
        this.configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
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
    async setConfig(key: any, value: any) {
        this.configData[key] = value
        fs.writeFileSync(this.configPath, JSON.stringify(this.configData, null, 4))
    }

    /**
     * setApiEndpoint
     * @param value
     */
    async setApiEndpoint(value: any) {
        const apiMode = await axios.get(`${value}/mdos/api-mode`)
        this.configData.FRAMEWORK_ONLY = apiMode.data.mdos_framework_only
        this.configData.MDOS_API_URI = value
        fs.writeFileSync(this.configPath, JSON.stringify(this.configData, null, 4))
    }

    /**
     * getCliVersion
     * @returns 
     */
    getCliVersion() {
        return pjson.version
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

        const axiosConfig: AxiosConfig = {
            timeout: 0,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        }

        // Set oauth2 cookie if necessary
        if (this.getConfig('FRAMEWORK_ONLY')) {
            axiosConfig.headers = {
                mdos_version: pjson.version,
            }
        } else {
            axiosConfig.headers = {
                Authorization: `Bearer ${this.getConfig('ACCESS_TOKEN')}`,
                mdos_version: pjson.version,
            }
        }

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
            error("Please set your mdos domain name using the command 'mdos configure api-endpoint http ://mdos-api.<your domain here>'")
            process.exit(1)
        }
        return API_URI
    }

    /**
     * checkMDosManifestCompatible
     * @param appYaml 
     */
    checkMDosManifestCompatible(appYaml: any) {
        let FRAMEWORK_ONLY = this.getConfig('FRAMEWORK_ONLY')
        if (FRAMEWORK_ONLY == undefined || FRAMEWORK_ONLY == null) {
            error("Please set your mdos domain name using the command 'mdos configure api-endpoint http ://mdos-api.<your domain here>'")
            process.exit(1)
        }
        if(FRAMEWORK_ONLY && (!appYaml.schemaVersion || !appYaml.schemaVersion.endsWith('-framework'))) {
            error("This application does not have the proper schemaVersion for the target MDos platform")
            process.exit(1)
        } else if(!FRAMEWORK_ONLY && (!appYaml.schemaVersion || appYaml.schemaVersion.endsWith('-framework'))) {
            error("This application does not have the proper schemaVersion for the target MDos platform")
            process.exit(1)
        }
    }

    /**
     * validateJwt
     */
    async validateJwt(skipAuthMsg?: boolean, flags?: any) {
        // Reset potential OAUTH Cookie if username provided
        if (flags && (flags.username || flags.password)) {
            this.setConfig('ACCESS_TOKEN', null)
            skipAuthMsg = true
        }

        const _validateCookie = async () => {
            const testResponse = await this.api('token-introspect', 'post', { access_token: this.getConfig('ACCESS_TOKEN') }, true)

            if (!testResponse.data.active) {
                // token expired
                this.setConfig('ACCESS_TOKEN', null)
                warn('Your current token has expired or is invalid. You need to re-authenticate')
                const userCreds: any = await this.validateJwt(true, flags)
                return userCreds
            }
        }

        const token = this.getConfig('ACCESS_TOKEN')

        if (!token || token.length == 0) {
            if (!skipAuthMsg) warn('Authentication required')
            const responses = await inquirer.prompt(
                [
                    {
                        type: 'input',
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
                ]
                    .filter((q) => (q.name == 'username' && flags && flags.username ? false : true))
                    .filter((q) => (q.name == 'password' && flags && flags.password ? false : true))
            )

            const loginResponse = await this.api(
                'authentication',
                'post',
                {
                    strategy: 'keycloak',
                    username: responses.username ? responses.username : flags.username,
                    password: responses.password ? responses.password : flags.password,
                },
                true
            )
            if (loginResponse.data.error) {
                error(loginResponse.data.error_description)
                process.exit(1)
            }
            this.setConfig('ACCESS_TOKEN', loginResponse.data.access_token)
            console.log()
            return {
                username: responses.username ? responses.username : flags.username,
                password: responses.password ? responses.password : flags.password,
            }
        } else {
            const _userCreds = await _validateCookie()
            return _userCreds
        }
    }

    /**
     * introspectJwt
     * @returns
     */
    async introspectJwt() {
        const testResponse = await this.api('token-introspect', 'post', { access_token: this.getConfig('ACCESS_TOKEN'), include_roles: true }, true)
        return testResponse.data
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
    async collectClientId(flags: any, question: string, includeAll?: boolean) {
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
            const optionListItems = clientResponse.data.map((o: { clientId: any; id: any }) => {
                return { name: `Namespace: ${o.clientId}`, value: o.id }
            })
            if (includeAll) {
                optionListItems.push(new inquirer.Separator())
                optionListItems.push({
                    name: 'All namespaces available to me',
                    value: '*',
                })
            }

            clientResponses = await inquirer.prompt([
                {
                    name: 'clientUuid',
                    message: question,
                    type: 'list',
                    choices: optionListItems,
                },
            ])
            if (clientResponses.clientUuid == '*') {
                clientResponses.clientId = '*'
            } else {
                const targetClient = clientResponse.data.find((o: { id: any }) => o.id == clientResponses.clientUuid)
                clientResponses.clientId = targetClient.clientId
            }
        }
        return clientResponses
    }

    /**
     * collectNamespace
     * @param flags
     * @param question
     * @returns
     */
    async collectNamespace(flags: any, question: string) {
        const nsResponse = await this.api('kube?target=namespaces', 'get')
        if (nsResponse.data.length == 0) {
            error('There are no namespaces available')
            process.exit(1)
        }
        if (flags.clientId) {
            const targetNs = nsResponse.data.find((o: { name: string }) => o.name == flags.namespace)
            if (!targetNs) {
                error('Could not find namespace: ' + flags.namespace)
                process.exit(1)
            }
            return targetNs
        } else {
            const nsQResponse = await inquirer.prompt([
                {
                    name: 'namespace',
                    message: question,
                    type: 'list',
                    choices: nsResponse.data.map((o: { name: string }) => {
                        return { name: `Namespace: ${o.name}`, value: o }
                    }),
                },
            ])

            return nsQResponse.namespace
        }
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

    /**
     * showBusy
     * @param text 
     * @param skipLine 
     */
    showBusy(text:string, skipLine?:boolean) {
        if(skipLine) console.log()
        CliUx.ux.action.start(text)
    }

    /**
     * showBusyDone
     */
    showBusyDone() {
        CliUx.ux.action.stop()
    }

    /**
     * showBusyError
     * @param msg 
     * @param err 
     * @param exit 
     */
    showBusyError(msg?:any, err?:any) {
        CliUx.ux.action.stop(chalk.red(msg ? msg : 'error'))
        if(err) this.showError(err)
    }
}
