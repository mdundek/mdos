import { Flags, CliUx } from '@oclif/core'
import Command from '../base'
const { context } = require('../lib/tools')

/**
 * Command
 *
 * @export
 * @class Status
 * @extends {Command}
 */
export default class Status extends Command {
    static aliases = []
    static description = 'Get current status of your CLI environment'

    // ******* FLAGS *******
    static flags = {}
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(Status)
       
        const allConfigs:any = this.getAllConfigs()
        const avKeys: any[] = []
        for (let key of Object.keys(allConfigs)) {
            if (key != 'ACCESS_TOKEN') avKeys.push(key)
        }

        console.log()
        CliUx.ux.table(
            avKeys,
            {
                key: {
                    header: 'KEY',
                    minWidth: 20,
                    get: (row) => row, //.toUpperCase()
                },
                value: {
                    header: 'VALUE',
                    minWidth: 20,
                    get: (row) => allConfigs[row],
                },
            },
            {
                printLine: this.log.bind(this),
            }
        )
        console.log()
    }
}
