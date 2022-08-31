import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../lib/tools')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 5)

export default class Component extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		name: Flags.string({ char: 'n', description: 'An application component name' }),
	}
	// ***** QUESTIONS *****
    static questions = []
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(Component)

		// Detect mdos project yaml file
		let appYamlPath = path.join(process.cwd(), "mdos.yaml")
		if (!fs.existsSync(appYamlPath)) {
			appYamlPath = path.join(path.dirname(process.cwd()), "mdos.yaml")
			if (!fs.existsSync(appYamlPath)) {
				error("You don't seem to be in a mdos project folder")
				process.exit(1)
			}
		}
		
		// Load mdos yaml file
		let appYaml
		try {
			appYaml = YAML.parse(fs.readFileSync(appYamlPath, 'utf8'))
		} catch (error) {
			this.showError(error)
			process.exit(1);
		}

		let appRootPath = path.dirname(appYamlPath);

		// Collect basic data
		let mdosAppCompDir
		let responses
		if(!flags.name) {
			responses = await inquirer.prompt([{
				group: "component",
				type: 'text',
				name: 'name',
				message: 'Enter a application component name:',
				validate: (value: string) => {
					if(value.trim().length == 0)
						return "Mandatory field"
					else if(!(/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value)))
						return "Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)"
					if (fs.existsSync(path.join(appRootPath, value))) {
						return "A folder with this name already exists for this project"
					}
					return true
				}
			}])
			mdosAppCompDir = path.join(appRootPath, responses.name)
		} else {
			// Make sure app folder does not exist yet
			mdosAppCompDir = path.join(appRootPath, flags.name)
			if (fs.existsSync(mdosAppCompDir)) {
				warn("A folder with this name already exists in the project directory");
				process.exit(1);
			}
		}

		const appName = flags.name ? flags.name : responses.name

		// Create default Dockerfile
		try {
			fs.mkdirSync(mdosAppCompDir, { recursive: true });
			fs.writeFileSync(path.join(mdosAppCompDir, "Dockerfile"), "# Populate your dockerfile for this component here\n");
		} catch (error) {
			this.showError(error)
			process.exit(1);
		}

		// Generate basic app yaml data
		if (!appYaml.components)
			appYaml.components = []

		appYaml.components.push({
			name: appName,
			image: `${appYaml.tenantName}/${appName}`,
			uuid: `${nanoid()}-${nanoid()}`,
			tag: "0.0.1"
		})

		// Create mdos.yaml file
		try {
			fs.writeFileSync(appYamlPath, YAML.stringify(appYaml));
		} catch (error) {
			this.showError(error)
			try { fs.rmdirSync(mdosAppCompDir, { recursive: true, force: true }); } catch (_e) { }
			process.exit(1);
		}
	}
}
