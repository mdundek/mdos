const { program } = require('commander');

const oidcProviderAdd = require('./oidc-provider/add.js');

program
  .name('mdos')
  .version('0.0.1');

let generate = program
    .command('generate <command>')
    .description('generate applications and application components');

generate.command('application')
    .description('generate a new high level application')
    .requiredOption('-n, --name <name>', 'Your application name')
    .action(async (options) => {
        console.log(options);
    });

generate.command('component')
    .description('generate a application component for the current application')
    .requiredOption('-n, --name <name>', 'Your application component name')
    .action(async (options) => {
        console.log(options);
    });

let oidc_provider = program
    .command('oidc-provider <command>')
    .description('work with OIDC provider on the platform');

oidc_provider.command('add')
    .description('add a new OIDC provider to the platform')
    .action(oidcProviderAdd);

// program
//   .command('setup [env]')
//   .description('run setup commands for all envs')
//   .option('-s, --setup_mode <mode>', 'Which setup mode to use', 'normal')
//   .action((env, options) => {
//     env = env || 'all';
//     console.log('read config from %s', program.opts().config);
//     console.log('setup for %s env(s) with %s mode', env, options.setup_mode);
//   });

// program
//   .command('exec <script>')
//   .alias('ex')
//   .description('execute the given remote cmd')
//   .option('-e, --exec_mode <mode>', 'Which exec mode to use', 'fast')
//   .action((script, options) => {
//     console.log('read config from %s', program.opts().config);
//     console.log('exec "%s" using %s mode and config %s', script, options.exec_mode, program.opts().config);
//   }).addHelpText('after', `
// Examples:
//   $ deploy exec sequential
//   $ deploy exec async`
//   );






program.parseAsync(process.argv);