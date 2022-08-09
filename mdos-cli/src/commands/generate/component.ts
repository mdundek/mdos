import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'

const inquirer = require('inquirer')
const { info, error, warn, filterQuestions } = require('../../lib/tools')
const chalk = require('chalk')

export default class Component extends Command {
	static description = 'describe the command here'

	// ******* FLAGS *******
	static flags = {
		// username: Flags.string({ char: 'u', description: 'Keycloak admin username' }),
	}
	// ***** QUESTIONS *****
    static questions = [
        // {
        //     group: "<group>",
        //     type: 'text',
        //     name: 'username',
        //     message: 'What admin username would you like to configure for Keycloak?',
        //     validate: (value: { trim: () => { (): any; new (): any; length: number } }) => (value.trim().length == 0 ? `Mandatory field` : true),
        // }
    ]
    // ***********************

	public async run(): Promise<void> {
		const { flags } = await this.parse(Component)

		let q = await inquirer.prompt(filterQuestions(Component.questions, "<group>", flags));
		let responses = q.length > 0 ? await inquirer.prompt(q) : {}
	}
}
