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

export default class Application extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		tenantName: Flags.string({ char: 't', description: 'A tenant name that this application belongs to' }),
		applicationName: Flags.string({ char: 'n', description: 'An application name' }),
	}
	// ***** QUESTIONS *****
    static questions = [
		{
            group: "application",
            type: 'text',
            name: 'applicationName',
            message: 'Enter a application name:',
            validate: (value: { trim: () => { (): any; new(): any; length: number } }) => {
				if(value.trim().length == 0)
					return "Mandatory field"
				if (fs.existsSync(path.join(process.cwd(), value))) {
					return "A folder with this name already exists in this directory"
				}
				return true
			}
        }, {
            group: "application",
            type: 'text',
            name: 'tenantName',
            message: 'Enter a tenant name that this application belongs to:',
            validate: (value: { trim: () => { (): any; new(): any; length: number } }) => {
				if(value.trim().length == 0)
					return "Mandatory field"
				return true
			}
        }
    ]
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(Application)

		// Collect info
		let q = filterQuestions(Application.questions, "application", flags);
		let responses = q.length > 0 ? await inquirer.prompt(q) : {}

		// Make sure app folder does not exist yet
		const mdosAppFile = path.join(process.cwd(), flags.applicationName ? flags.applicationName : responses.applicationName)
		if (fs.existsSync(mdosAppFile)) {
			warn("A folder with this name already exists in this directory");
			process.exit(1);
		}

		// Create app folder
		try {
			fs.mkdirSync(mdosAppFile, { recursive: true });
		} catch (error) {
			this.showError(error)
			process.exit(1);
		}

		// Create mdos.yaml file
		try {
			fs.writeFileSync(path.join(mdosAppFile, "mdos.yaml"), YAML.stringify({
				tenantName: flags.tenantName ? flags.tenantName : responses.tenantName,
				appName: flags.applicationName ? flags.applicationName : responses.applicationName,
				uuid: `${nanoid()}-${nanoid()}`,
				components: []
			}));
		} catch (error) {
			this.showError(error)
			process.exit(1);
		}

		// Create app volumes folder
		const volumesFolder = path.join(mdosAppFile, "volumes")
		try {
			fs.mkdirSync(volumesFolder, { recursive: true });
			fs.writeFileSync(path.join(volumesFolder, "README.md"), "# Important\n\nApplication volumes that are used to sync data to containers are stored in this folder, do not remove");
		} catch (error) {
			this.showError(error)
			process.exit(1);
		}
	}
}
