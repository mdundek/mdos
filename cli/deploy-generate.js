const commander = require('commander');
const program = new commander.Command();
program
  .command('application')
  .description('application generation description')
  .action(() => {
    console.log('Called generate');
  });
program.parse(process.argv);