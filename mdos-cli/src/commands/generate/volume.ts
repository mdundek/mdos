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

        // Make sure the API domain has been configured
        this.checkIfDomainSet()

        // Get volumes base path
        const volumesPath = path.join(path.dirname(process.cwd()), 'volumes')

        // Detect mdos project yaml file
        const appYamlPath = path.join(path.dirname(process.cwd()), 'mdos.yaml')
        if (!fs.existsSync(appYamlPath)) {
            error("You don't seem to be in a mdos component folder")
            process.exit(1)
        }

        // Load mdos yaml file
        let appYaml: { tenantName: string; components: any[] }
        try {
            appYaml = YAML.parse(fs.readFileSync(appYamlPath, 'utf8'))
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }

        // Identify component
        const compName = path.basename(process.cwd())
        const targetCompYaml = appYaml.components.find((c: { name: any }) => c.name == compName)
        if (!targetCompYaml) {
            error('Component not found in mdos.yaml file')
            process.exit(1)
        }

        let aggregatedResponses: any = {}

        // Collect base data
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
        ])
        aggregatedResponses = { ...aggregatedResponses, ...responses }

        // If use host path
        if (!this.getConfig('FRAMEWORK_ONLY') && !aggregatedResponses.useHostpath) {
            responses = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'inject',
                    default: false,
                    when: (values: any) => {
                        context(
                            'You can let MDos mirror data that is inside your local volume folder in this project directory structure with the target component POD volume during deployments.',
                            false,
                            true
                        )
                        return true
                    },
                    message: 'Do you want to populate your volume with some static content before the container starts?',
                },
            ])
            aggregatedResponses = { ...aggregatedResponses, ...responses }
        }

        // If sync volume on deploy?
        if (aggregatedResponses.inject) {
            responses = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'syncTrigger',
                    message: 'What behaviour should this volume sync process follow?',
                    choices: [
                        {
                            name: 'Synchronize only when the volume inside the POD is empty (on first deploy)',
                            value: 'initial',
                        },
                        {
                            name: 'Synchronize the volume with my local volume data every time I deploy this application',
                            value: 'always',
                        },
                    ],
                },
            ])
            aggregatedResponses = { ...aggregatedResponses, ...responses }
        }

        // If not hostpath, ask if referencing existing shared volume
        if (!aggregatedResponses.useHostpath) {
            responses = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'shared',
                    message: 'Is this volume referencing an existing shared volume?',
                    default: false,
                },
            ])
            aggregatedResponses = { ...aggregatedResponses, ...responses }

            // If not referencing shared volume, collect size
            if (!aggregatedResponses.shared) {
                responses = await inquirer.prompt([
                    {
                        type: 'number',
                        name: 'size',
                        message: 'Size in Gb (ex. 0.2, 1, 100...) to allocate to this volume:',
                        validate: (value: string) => {
                            if (value.trim().length == 0) return 'Mandatory field'
                            return true
                        },
                    },
                ])
                aggregatedResponses = { ...aggregatedResponses, ...responses }
            }
            // Yes, shared
            else {
                if (!this.getConfig('FRAMEWORK_ONLY')) {
                    // Make sure we have a valid oauth2 cookie token
                    // otherwise, collect it
                    try {
                        await this.validateJwt()
                    } catch (err) {
                        this.showError(err)
                        process.exit(1)
                    }
                }

                // Get namespace shared volumes
                let volResponse
                try {
                    volResponse = await this.api(`kube?target=shared-volumes&namespace=${appYaml.tenantName}`, 'get')
                } catch (err) {
                    this.showError(err)
                    process.exit(1)
                }

                if (volResponse.data.length == 0) {
                    error(`No Shared Volumes found for namespace ${appYaml.tenantName}`)
                    process.exit(1)
                }

                responses = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'sharedVolumeName',
                        message: 'Select the Shared Volume to mount:',
                        choices: volResponse.data.map((vol: any) => {
                            return {
                                name: `${vol.metadata.name} (Size: ${vol.spec.resources.requests.storage})`,
                                value: vol.metadata.name,
                            }
                        }),
                    },
                ])
                aggregatedResponses = { ...aggregatedResponses, ...responses }
            }
        }

        // Update ingress
        if (!targetCompYaml.volumes) targetCompYaml.volumes = []

        type Volume = {
            syncVolume?: boolean
            trigger?: string
            name?: string
            mountPath: string
            hostPath?: string
            sharedVolumeName?: string
            size?: string
        }

        const vol: Volume = {
            name: aggregatedResponses.name,
            mountPath: aggregatedResponses.mountpath,
        }

        if (aggregatedResponses.inject) {
            vol.syncVolume = true
            vol.trigger = aggregatedResponses.syncTrigger

            if (!this.getConfig('FRAMEWORK_ONLY')) {
                try {
                    const volumeDirPath = path.join(volumesPath, aggregatedResponses.name)
                    if (fs.existsSync(volumeDirPath)) {
                        error('This volume already exists')
                        process.exit(1)
                    }

                    fs.mkdirSync(volumeDirPath, { recursive: true })
                    fs.writeFileSync(path.join(volumeDirPath, 'README.md'), 'Place your volume static data in this folder\n')
                } catch (err) {
                    this.showError(err)
                    process.exit(1)
                }
            }
        }

        if (aggregatedResponses.size) vol.size = `${aggregatedResponses.size}Gi`

        if (aggregatedResponses.useHostpath) vol.hostPath = aggregatedResponses.hostpath

        if (aggregatedResponses.sharedVolumeName) vol.sharedVolumeName = aggregatedResponses.sharedVolumeName

        targetCompYaml.volumes.push(vol)

        appYaml.components = appYaml.components.map((comp) => (comp.name == compName ? targetCompYaml : comp))

        // Create mdos.yaml file
        try {
            fs.writeFileSync(appYamlPath, YAML.stringify(appYaml))
        } catch (err) {
            this.showError(err)
            process.exit(1)
        }
    }
}
