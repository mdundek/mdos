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
const { info, error, warn, filterQuestions } = require('./lib/tools')

type AxiosConfig = {
	headers?: any;
};

export default abstract class extends Command {
	authMode: string;

	constructor(argv: string[], config: Config) {
		if (!fs.existsSync(path.join(os.homedir(), ".mdos"))) {
			fs.mkdirSync(path.join(os.homedir(), ".mdos"));
		}
		nconf.file({ file: path.join(os.homedir(), ".mdos", "cli.json") });
		super(argv, config);

		this.authMode = "none"
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
		let API_URI = await this._collectApiServerUrl();

		// Set oauth2 cookie if necessary
		const axiosConfig: AxiosConfig = {};
		if(this.authMode != "none") {
			const kcCookie = this.getConfig("JWT_TOKEN");
			axiosConfig.headers = { Cookie: `_oauth2_proxy=${kcCookie};` }
		}
		
		if(method == "post") {
			return await axios.post(`${API_URI}/${endpoint}`, body, axiosConfig);
		} else if(method == "get") {
			return await axios.get(`${API_URI}/${endpoint}`, axiosConfig);
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
		} else {
			await _validateCookie();
		}
	}
}
