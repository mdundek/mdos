// src/base.ts
import { Command, Config } from '@oclif/core'
import { copyFileSync } from 'fs';
const fs = require('fs');
const nconf = require('nconf');
const os = require("os");
const path = require("path");


const axios = require('axios').default;

const api_uri = "http://localhost:3030";

export default abstract class extends Command {

	constructor(argv: string[], config: Config) {
		if (!fs.existsSync(path.join(os.homedir(), ".mdos"))) {
			fs.mkdirSync(path.join(os.homedir(), ".mdos"));
		}
		nconf.file({ file: path.join(os.homedir(), ".mdos", "cli.json") });

		super(argv, config);

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
		if(method == "post") {
			return await axios.post(`${api_uri}/${endpoint}`, body);
		} else if(method == "get") {
			return await axios.get(`${api_uri}/${endpoint}`);
		}
	}
}
