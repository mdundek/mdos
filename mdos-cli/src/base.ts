// src/base.ts
import { Command } from '@oclif/core'

const axios = require('axios').default;

const api_uri = "http://localhost:3030";

export default abstract class extends Command {

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
