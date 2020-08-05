import * as yargs from 'yargs';

import start from './start';

yargs
  .scriptName('payer')
  .command(start)
  .demandCommand(1, 'Choose a command from the above list')
  .help().argv;
