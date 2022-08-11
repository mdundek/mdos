import {Flags} from '@oclif/core'
import Command from '../base'

export default class Deploy extends Command {
  static description = 'describe the command here'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {
    // flag with a value (-n, --name=VALUE)
    name: Flags.string({char: 'n', description: 'name to print'}),
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Deploy)

    // Make sure we have a valid oauth2 cookie token
    // otherwise, collect it
    try {
      await this.validateJwt();
    } catch (error) {
      this.showError(error);
      process.exit(1);
    }

    const name = flags.name ?? 'world'
    this.log(`hello ${name} from /home/mdundek/workspaces/mdos-cli/src/commands/deploy.ts`)
    if (args.file && flags.force) {
      this.log(`you input --force and --file: ${args.file}`)
    }
  }
}
