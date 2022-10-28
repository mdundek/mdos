import { Flags } from '@oclif/core'
import Command from '../../base'
const inquirer = require('inquirer')
const { context, error } = require('../../lib/tools')
const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

/**
 * Command
 *
 * @export
 * @class Volume
 * @extends {Command}
 */
export default class Volume extends Command {
    static aliases = ['add:volume', 'volume:add', 'add:storage', 'storage:add', 'volume:generate', 'generate:storage', 'storage:generate']
    static description = 'Persist your data using volumes / storage for your components'

    // ******* FLAGS *******
    static flags = {
        hostpath: Flags.string({
            description: 'If set, the volume will be mounted as a host-path volume on this specified host path',
        }),
        mountpath: Flags.string({ description: 'The mount path inside your container for this volume' }),
        inject: Flags.string({ description: 'If set, the volume will be pre-populated with some files that you specify' }),
        name: Flags.string({ description: 'Name for this volume' }),
    }
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Volume)

        // Get volumes base path
        const volumesPath = path.join(path.dirname(process.cwd()), 'volumes')

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
                type: 'input',
                name: 'name',
                message: 'Enter a name for this volume folder:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    else if (!/^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/.test(value))
                        return 'Invalid value, only alpha-numeric and dash charactrers are allowed (between 2 - 20 characters)'
                    return true
                },
            },
            {
                type: 'input',
                name: 'mountpath',
                message: 'Enter the mount path inside your container:',
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
                    context('Host path mounts are not suitable for multi-node clusters', false, true)
                    return true
                },
                message: 'Do you want to mount this folder directly to a local host path on the cluster node?',
            },
            {
                type: 'input',
                name: 'hostpath',
                when: (values: any) => {
                    return values.useHostpath
                },
                message: 'Enter the full path on the target cluster node(s) that this volume should be mounted to:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
            {
                type: 'confirm',
                name: 'inject',
                default: false,
                when: (values: any) => {
                    if (!values.useHostpath) {
                        context('Content will be copied over to the cluster host on deployment', false, true)
                        return true
                    } else {
                        return false
                    }
                },
                message: 'Do you want to populate your volume with some static content before the container starts?',
            },
            {
                type: 'number',
                name: 'size',
                when: (values: any) => {
                    return !values.useHostpath
                },
                message: 'Size in Gb (ex. 0.2, 1, 100...) to allocate to this volume:',
                validate: (value: string) => {
                    if (value.trim().length == 0) return 'Mandatory field'
                    return true
                },
            },
        ])

        // Update ingress
        if (!targetCompYaml.volumes) targetCompYaml.volumes = []

        type Volume = {
            syncVolume?: boolean
            name?: string
            mountPath: string
            hostPath?: string
            size?: string
        }

        const vol: Volume = {
            name: responses.name,
            mountPath: responses.mountpath,
        }

        if (responses.inject) {
            vol.syncVolume = true

            try {
                const volumeDirPath = path.join(volumesPath, responses.name)
                if (fs.existsSync(volumeDirPath)) {
                    error('This volume already exists')
                    process.exit(1)
                }

                fs.mkdirSync(volumeDirPath, { recursive: true })
                fs.writeFileSync(path.join(volumeDirPath, 'README.md'), 'Place your volume static data in this folder\n')
            } catch (error) {
                this.showError(error)
                process.exit(1)
            }
        }

        if (responses.size) vol.size = `${responses.size}Gi`

        if (responses.useHostpath) vol.hostPath = responses.hostpath

        targetCompYaml.volumes.push(vol)

        appYaml.components = appYaml.components.map((comp) => (comp.name == compName ? targetCompYaml : comp))

        // Create mdos.yaml file
        try {
            fs.writeFileSync(appYamlPath, YAML.stringify(appYaml))
        } catch (error) {
            this.showError(error)
            process.exit(1)
        }
    }
}
