import { Flags, CliUx } from '@oclif/core'
import Command from '../base'
const { error } = require('../lib/tools')
const { context } = require('../lib/tools')

export default class GetConfig extends Command {
    static description = 'Get a specific config on your local CLI environement'

    static flags = {
        auth: Flags.boolean({ description: 'authentication mode' }),
        backend: Flags.boolean({ description: 'API backend URI' })
    }

    public async run(): Promise<void> {
        const { flags } = await this.parse(GetConfig)
        if(flags.auth) {
          context(this.getConfig("AUTH_MODE"));
        }
        else if(flags.backend) {
          context(this.getConfig("MDOS_API_URI"));
        }
        else {
          const allConfigs = this.getAllConfigs()
          const avKeys: any[] = []
          for(let key of Object.keys(allConfigs)){
            if(key != "JWT_TOKEN")
              avKeys.push(key)
          }

          console.log();
          CliUx.ux.table(avKeys, {
              key: {
                  header: 'KEY',
                  minWidth: 20,
                  get: row => row //.toUpperCase()
              },
              value: {
                  header: 'VALUE',
                  minWidth: 20,
                  get: row => allConfigs[row]
              }
          }, {
              printLine: this.log.bind(this)
          })
          console.log();
        }
    }
}
