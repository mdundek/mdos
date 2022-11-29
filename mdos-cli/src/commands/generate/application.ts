import { Flags } from '@oclif/core'
import Command from '../../base'
import { customAlphabet } from 'nanoid'
const inquirer = require('inquirer')
const { warn, filterQuestions } = require('../../lib/tools')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 5)

/**
 * Command
 *
 * @export
 * @class Application
 * @extends {Command}
 */
export default class Application extends Command {
    static aliases = ['generate:app', 'gen:app', 'create:application', 'create:app']
    static description = 'Scaffold a new application in the current directory'

    // ******* FLAGS *******
    static flags = {
        tenantName: Flags.string({ char: 't', description: 'A tenant name that this application belongs to' }),
        applicationName: Flags.string({ char: 'n', description: 'An application name' }),
    }

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const questions = [
            {
                group: 'application',
                type: 'input',
                name: 'applicationName',
                message: 'Enter a application name:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                    if (fs.existsSync(path.join(process.cwd(), value))) {
                        return 'A folder with this name already exists in this directory'
                    }
                    return true
                },
            },
            {
                group: 'application',
                type: 'input',
                name: 'tenantName',
                message: this.getConfig('FRAMEWORK_ONLY')
                    ? 'Enter a target namespace name for this application:'
                    : 'Enter a tenant name that this application belongs to:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                    return true
                },
            },
        ]

        const { flags } = await this.parse(Application)

        // Collect info
        let q = filterQuestions(questions, 'application', flags)
        let responses = q.length > 0 ? await inquirer.prompt(q) : {}

        // Make sure app folder does not exist yet
        const mdosAppFile = path.join(process.cwd(), flags.applicationName ? flags.applicationName : responses.applicationName)
        if (fs.existsSync(mdosAppFile)) {
            warn('A folder with this name already exists in this directory')
            process.exit(1)
        }

        // Create app folder
        try {
            fs.mkdirSync(mdosAppFile, { recursive: true })
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Create mdos.yaml file
        try {
            fs.writeFileSync(
                path.join(mdosAppFile, 'mdos.yaml'),
                YAML.stringify({
                    schemaVersion: 'v1',
                    tenantName: flags.tenantName ? flags.tenantName : responses.tenantName,
                    appName: flags.applicationName ? flags.applicationName : responses.applicationName,
                    uuid: `${nanoid()}-${nanoid()}`,
                    components: [],
                })
            )
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Create app volumes folder
        const volumesFolder = path.join(mdosAppFile, 'volumes')
        try {
            fs.mkdirSync(volumesFolder, { recursive: true })
            fs.writeFileSync(
                path.join(volumesFolder, 'README.md'),
                '# Important\n\nApplication volumes that are used to sync data to containers are stored in this folder, do not remove'
            )
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
    }
}
