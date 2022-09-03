import { Hook, toConfiguredId, toStandardizedId } from '@oclif/core'
const inquirer = require('inquirer')

const hook: Hook.CommandIncomplete = async function ({ config, matches, argv }) {
    const { command } = await inquirer.prompt([
        {
            name: 'command',
            type: 'list',
            message: 'Which of these commands would you like to run?',
            choices: matches.map((p) => toConfiguredId(p.id, config)),
        },
    ])

    if (argv.includes('--help') || argv.includes('-h')) {
        return config.runCommand('help', [toStandardizedId(command, config)])
    }

    return config.runCommand(toStandardizedId(command, config), argv)
}

export default hook
