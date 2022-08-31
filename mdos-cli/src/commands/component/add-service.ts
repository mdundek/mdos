import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../lib/tools')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

export default class AddService extends Command {
    static description = 'describe the command here'

    // ******* FLAGS *******
	static flags = {}
    // ***********************

    public async run(): Promise<void> {
        const { flags } = await this.parse(AddService)

		// Detect mdos project yaml file
		const appYamlPath = path.join(path.dirname(process.cwd()), "mdos.yaml")
		if (!fs.existsSync(appYamlPath)) {
			error("You don't seem to be in a mdos component folder")
			process.exit(1)
		}

		// Load mdos yaml file
		let appYaml: { components: any[] }
		try {
			appYaml = YAML.parse(fs.readFileSync(appYamlPath, 'utf8'))
		} catch (error) {
			this.showError(error)
			process.exit(1);
		}
		
        // Identify component
		const compName = path.basename(process.cwd())
		const targetCompYaml = appYaml.components.find((c: { name: any }) => c.name == compName)
		if(!targetCompYaml) {
			error("Component not found in mdos.yaml file")
			process.exit(1)
		}

		// Collect info
		let port
		let svcname: any
		
		let responses = await inquirer.prompt([
			{
				type: 'string',
				name: 'name',
				message: 'Enter a name for the service to add a port to:',
				validate: (value: string) => {
					if(value.trim().length == 0)
            			return "Mandatory field"
					else if(!(/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value)))
						return "Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)"
					return true
				}
			},
			{
				type: 'string',
				name: 'port',
				message: 'Specify a port number on which your application needs to be accessible on:',
				validate: (value: string) => {
					if(value.trim().length < 2)
						return "Invalid port"
					if(this.isPositiveInteger(value)) {
						return targetCompYaml.ports && targetCompYaml.ports.find((p: { port: number }) => p.port == parseInt(value)) ? "Port already declared" : true
					} else {
						return 'Invalid port';
					}
				}
			}
		])
		port = parseInt(responses.port)
		svcname = responses.name
		
		// Update ports
		if(!targetCompYaml.services)
			targetCompYaml.services = []

		const existingsvc = targetCompYaml.services.find((s: { name: any }) => s.name == svcname)
		if(existingsvc) {
			existingsvc.ports.push({
				port: port
			});
		} else {
			targetCompYaml.services.push({
				name: svcname,
				ports: [
					{
						port: port
					}
				]
			});
		}

		appYaml.components = appYaml.components.map(comp => comp.name == compName ? targetCompYaml : comp)
		
		// Create mdos.yaml file
		try {
			fs.writeFileSync(appYamlPath, YAML.stringify(appYaml));
		} catch (error) {
			this.showError(error)
			process.exit(1);
		}
    }
}
