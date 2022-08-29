// src/base.ts
import { Command, Config } from '@oclif/core'
import { copyFileSync } from 'fs';
const fs = require('fs');
const nconf = require('nconf');
const os = require("os");
const path = require("path");
const inquirer = require('inquirer')
const open = require('open');
const axios = require('axios').default;
const { info, error, warn, filterQuestions, extractErrorCode, extractErrorMessage, getConsoleLineHandel } = require('./lib/tools')
const SocketManager = require("./lib/socket.js");

type AxiosConfig = {
	timeout: number;
	headers?: any;
};

export default abstract class extends Command {
	authMode: string;
	socketManager: any;
	getConsoleLineHandel: any;

	/**
	 * constructor
	 * @param argv 
	 * @param config 
	 */
	constructor(argv: string[], config: Config) {
		if (!fs.existsSync(path.join(os.homedir(), ".mdos"))) {
			fs.mkdirSync(path.join(os.homedir(), ".mdos"));
		}
		nconf.file({ file: path.join(os.homedir(), ".mdos", "cli.json") });
		super(argv, config);

		this.authMode = nconf.get("auth_mode")
		if(!this.authMode) this.authMode = "oidc"

		this.getConsoleLineHandel = getConsoleLineHandel;
	}

	/**
	 * initSocketIo
	 */
	async initSocketIo() {
		const API_URI = await this._collectApiServerUrl();
		let kcCookie = null;
		if(this.authMode != "none") {
			kcCookie = this.getConfig("JWT_TOKEN");
		}
		this.socketManager = new SocketManager(API_URI, kcCookie);
	}
	/**
	 * getConfig
	 * @param key 
	 * @returns 
	 */
	getConfig(key: any) {
		return nconf.get(key);
	}

	/**
	 * getConfig
	 * @param key 
	 * @param value 
	 */
	setConfig(key: any, value: any) {
		nconf.set(key, value);
		nconf.save(function (error: any) {
			if(error) {
				console.error("Could not save config file: ");
				console.log(error);
				process.exit(1);
			}
		});
	}

	/**
	 * api
	 * @param endpoint 
	 * @param method 
	 * @param body 
	 * @returns 
	 */
	async api(endpoint: string, method: string, body?: any) {
		const API_URI = await this._collectApiServerUrl();

		// Set oauth2 cookie if necessary
		const axiosConfig: AxiosConfig = {
			timeout: 0
		};
		if(this.authMode != "none") {
			const kcCookie = this.getConfig("JWT_TOKEN");
			axiosConfig.headers = { Cookie: `_oauth2_proxy=${kcCookie};` }
		}
		axiosConfig.timeout = 1000 * 60 * 10

		// ------------------------- INJECT TOKEN FOR TESTING ----------------------
		if(!axiosConfig.headers)
			axiosConfig.headers = {}
		axiosConfig.headers["x-auth-request-access-token"] = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJGTmNacDFCdGxlbTdYM3pSV3lBbFV2ckVoWVo2RDJjS3RRREswdlR5a3lZIn0.eyJleHAiOjE2NjA5MjUxNzcsImlhdCI6MTY2MDkyNDg3NywiYXV0aF90aW1lIjoxNjYwOTE2MjUxLCJqdGkiOiI5MzQ4MWM3Yy04ZGZhLTQyOTctOTVmOC04MDgxYzI1NWNmY2MiLCJpc3MiOiJodHRwczovL2tleWNsb2FrLm1kdW5kZWsubmV0d29yay9yZWFsbXMvbWRvcyIsImF1ZCI6WyJjcyIsImFjY291bnQiXSwic3ViIjoiOTFhYTEyYjctMWUxNC00N2ZkLThmZWMtYmM1NjMzZTljYTBlIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibWRvcyIsInNlc3Npb25fc3RhdGUiOiJiNGIyNTNlMy1mNDdjLTRiNzAtYWVlYi03YjcyNWRkNTc3NjMiLCJhY3IiOiIwIiwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iLCJkZWZhdWx0LXJvbGVzLW1kb3MiXX0sInJlc291cmNlX2FjY2VzcyI6eyJjcyI6eyJyb2xlcyI6WyJ1bWFfcHJvdGVjdGlvbiIsIm1kb3NfYWRtaW4iLCJmb29yb2xlIiwiZm9vYmFyLXJvbGUiXX0sIm1kb3MiOnsicm9sZXMiOlsiYWRtaW4iLCJtZG9zX2FkbWluIl19LCJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwic2lkIjoiYjRiMjUzZTMtZjQ3Yy00YjcwLWFlZWItN2I3MjVkZDU3NzYzIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInByZWZlcnJlZF91c2VybmFtZSI6Im1kdW5kZWsiLCJlbWFpbCI6Im1kdW5kZWtAZ21haWwuY29tIn0.iwf8Kg5-w9dgJZwUYy9T_a4m6BIElJshu-dn2EdeJx-d5pAsn8vkaJMuXqJh-szbOzB5kzk5_yoknct922254TsKvMd491m9qrhkCD-NSnYC1u_ZIKqC0JRt9B7KPl3icqX7zsk52NurAkGlLw2xuHRpDtSLHp9rsRYrPaTGsDQLuqu6jEITraPG1f29yvKqxj9KEtJY4IRLJxIEJg8iV-w7MGmuCm7y_QZw5BQPIu3Ab-9y1whGf3D1SVSynKpN1tvFDTe3GNQQhS0garf7R5wtjnp4_5d9lhDqv5UL6Flnidikh9Tol9ZTF-VNSEbHMPtztc83nHwiW8JHDu7Elg"
		// -------------------------------------------------------------------------
		
		if(method.toLowerCase() == "post") {
			return await axios.post(`${API_URI}/${endpoint}`, body, axiosConfig);
		} else if(method.toLowerCase() == "get") {
			return await axios.get(`${API_URI}/${endpoint}`, axiosConfig);
		} else if(method.toLowerCase() == "delete") {
			return await axios.delete(`${API_URI}/${endpoint}`, axiosConfig);
		}
	}

	/**
	 * _collectApiServerUrl
	 * @returns 
	 */
	async _collectApiServerUrl() {
		let API_URI = this.getConfig("MDOS_API_URI");
		if(!API_URI){
			const responses = await inquirer.prompt([{
				type: 'text',
				name: 'apiUrl',
				message: 'Please enter the target MDOS API URI:',
				validate: async (value: { trim: () => { (): any; new(): any; length: number; }; }) => {
					if(value.trim().length == 0) {
						return "Mandatory field"
					}
					try {
						await axios.get(`${value}/healthz`, {timeout: 2000})
						return true;
					} catch (error) {
						return "URL does not seem to be valid";
					}
				},
			}])
			API_URI = responses.apiUrl;

			this.setConfig("MDOS_API_URI", API_URI);
		}
		return API_URI;
	}

	/**
	 * _collectKeycloakUrl
	 * @returns 
	 */
	async _collectKeycloakUrl() {
		let KC_URI = this.getConfig("MDOS_KC_URI");
		if(!KC_URI){
			const responses = await inquirer.prompt([{
				type: 'text',
				name: 'kcUrl',
				message: 'Please enter the Keycloak base URL:',
				validate: async (value: { trim: () => { (): any; new(): any; length: number; }; }) => {
					if(value.trim().length == 0) {
						return "Mandatory field"
					}
					try {
						await axios.get(`${value}`, {timeout: 2000})
						return true;
					} catch (error) {
						return "URL does not seem to be valid";
					}
				},
			}])
			KC_URI = responses.kcUrl;

			this.setConfig("MDOS_KC_URI", KC_URI);
		}
		return KC_URI;
	}

	/**
	 * validateJwt
	 */
	async validateJwt() {
		if(this.authMode == "none")
			return;

		let API_URI = await this._collectApiServerUrl();
		let KC_URI = await this._collectKeycloakUrl();

		KC_URI = KC_URI.startsWith("http://") || KC_URI.startsWith("https://")  ? KC_URI.substring(KC_URI.indexOf("//") + 2) : KC_URI;
		
		const _validateCookie = async (takeNoAction?: boolean) => {
			const testResponse = await this.api("jwt", "get", true);
			if(testResponse.request.host == KC_URI) {
				if(takeNoAction) {
					return false;
				} else {
					// token expired
					this.setConfig("JWT_TOKEN", null);
					warn("Your current token has expired or is invalid. You need to re-authenticate");
					await this.validateJwt();
				}
			} else {
				if(takeNoAction) {
					return true;
				}
			}
		}

		const kcCookie = this.getConfig("JWT_TOKEN");
		if(!kcCookie) {
			await open(`${API_URI}/jwt`);

			await inquirer.prompt([{
				type: 'text',
				name: 'jwtToken',
				message: 'Please enter the JWT token now once you successfully authenticated yourself:',
				validate: async (value: { trim: () => { (): any; new(): any; length: number; }; }) => {
					if(value.trim().length == 0) {
						return "Mandatory field"
					}
					this.setConfig("JWT_TOKEN", value);
					const validTkn = await _validateCookie(true);
					if(!validTkn) {
						this.setConfig("JWT_TOKEN", null);
						return "Invalid cookie"
					}
					return true;
				},
			}])
			console.log()
		} else {
			await _validateCookie();
		}
	}

	/**
	 * collectClientId
	 * @param flags 
	 */
	async collectClientId(flags: any) {
		// Get all realm Clients
		const clientResponse = await this.api("keycloak?target=clients&realm=mdos", "get");
		if(clientResponse.data.length == 0) {
			error("There are no clients yet available. Create a client first using the command:");
			console.log("   mdos kc client create");
			process.exit(1);
		}

		// Select target client
		let clientResponses: {
			clientId: any; clientUuid: any , clientName: any
		};
		if(flags.clientId) {
			const targetClient = clientResponse.data.find((o: { clientId: string }) => o.clientId == flags.clientId)
			if(!targetClient) {
				error("Could not find client ID: " + flags.clientId);
				process.exit(1);
			}
			clientResponses = {clientId: targetClient.clientId, clientUuid: targetClient.id, clientName: targetClient.clientName};
		} else {
			clientResponses = await inquirer.prompt([{
				name: 'clientUuid',
				message: 'select a Client ID to create a Role for',
				type: 'list',
				choices: clientResponse.data.map((o: { clientId: any; id: any }) => {
					return { name: o.clientId, value: o.id }
				}),
			}])
			const targetClient = clientResponse.data.find((o: { id: any; }) => o.id == clientResponses.clientUuid)
			clientResponses.clientId = targetClient.clientId
			clientResponses.clientName = targetClient.clientName
		}
		return clientResponses;
	}

	/**
	 * showError
	 * @param error 
	 */
	showError(err: (arg0: any) => void) {
		error(extractErrorMessage(err));
	}

	/**
	 * isPositiveInteger
	 * @param str 
	 * @returns 
	 */
	isPositiveInteger(str: any) {
		if (typeof str !== 'string') {
		  return false;
		}
		const num = Number(str);
		if (Number.isInteger(num) && num > 0) {
		  return true;
		}
		return false;
	}
}
