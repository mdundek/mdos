import { Flags, CliUx } from '@oclif/core'
import Command from '../../base'

const inquirer = require('inquirer')
const { context, info, error, warn, filterQuestions } = require('../../lib/tools')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

export default class AddVolume extends Command {
    static description = 'add a volume to your deployed component'

    // ******* FLAGS *******
    static flags = {
        hostpath: Flags.string({ description: 'If set, the volume will be mounted as a host-path volume on this specified host path' }),
        mountpath: Flags.string({ description: 'The mount path inside your container for this volume' }),
        inject: Flags.string({ description: 'If set, the volume will be pre-populated with some files that you specify' }),
        name: Flags.string({ description: 'Name for this volume' }),
    }
    // ***********************

    public async run(): Promise<void> {
        const { flags } = await this.parse(AddVolume)

        // Detect mdos project yaml file
        const appYamlPath = path.join(path.dirname(process.cwd()), 'mdos.yaml')
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
            process.exit(1)
        }

        // Identify component
        const compName = path.basename(process.cwd())
        const targetCompYaml = appYaml.components.find((c: { name: any }) => c.name == compName)
        if (!targetCompYaml) {
            error('Component not found in mdos.yaml file')
            process.exit(1)
        }

        // Collect data
        let responses = await inquirer.prompt([
            {
                type: 'string',
                name: 'mountpath',
                message: 'Enter the mount path inside your container for this directory:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
            {
                type: 'confirm',
                name: 'useHostpath',
                default: false,
                when: (values: any) => {
                    context("Host path mounts are not suitable for multi-node clusters", false, true)
            		return true
            	},
                message: 'Do you want to mount this folder directly to a local host path on the cluster node?',
            },
            {
            	type: 'string',
            	name: 'hostpath',
            	when: (values: any) => {
            		return values.useHostpath
            	},
            	message: 'Enter the full path on the target cluster node(s) that this volume should be mounted to:',
            	validate: (value: string) => {
            		if(value.trim().length == 0)
            			return "Mandatory field"
            		return true
            	}
            },
			{
                type: 'confirm',
                name: 'inject',
                default: false,
                when: (values: any) => {
                    context('Content will be copied over to the cluster host on deployment', false, true)
                    return true
                },
                message: 'Do you want to populate your volume with some static content before the container starts?',
            },
            {
            	type: 'string',
            	name: 'name',
            	when: (values: any) => {
                    if(values.inject)
                        context("A volume folder will be created inside your component project directory to hold the static files");
            		return true
            	},
            	message: 'Enter a name for this volume folder:',
            	validate: (value: string) => {
            		if(value.trim().length == 0)
            			return "Mandatory field"
            		return true
            	}
            }
        ])

        // Update ingress
		if(!targetCompYaml.volumes)
            targetCompYaml.volumes = []

        type Volume = {
            syncVolume?: boolean,
            name?: string,
            mountPath: string,
            hostPath?: string
        }
        
        const vol: Volume = {
            name: responses.name,
			mountPath: responses.mountpath
		}

        if(responses.inject) {
            vol.syncVolume = true

            try {
                const volumeDirPath = path.join(process.cwd(), responses.name)
                fs.mkdirSync(volumeDirPath, { recursive: true });
                fs.writeFileSync(path.join(volumeDirPath, "README.md"), "Place your volume static data in this folder\n");
            } catch (error) {
                this.showError(error)
                process.exit(1);
            }
        }

        if(responses.useHostpath)
            vol.hostPath = responses.hostpath

        targetCompYaml.volumes.push(vol);

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
