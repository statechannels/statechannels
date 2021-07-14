import util from 'util';

import exaca from 'execa';
import jsonfile from 'jsonfile';
import waitOn from 'wait-on';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import chalk from 'chalk';
import got from 'got';

import {RoleConfig} from '../types';

const SCRIPT_DIR = './src/e2e-testing/scripts';

startAll();

async function startAll() {
  const commandArguments = await yargs(hideBin(process.argv))
    .option('roleFile', {
      alias: 'f',
      describe: 'The path to a file containing the role information',
      default: './src/e2e-testing/test-data/roles.json',
    })
    .option('loadFile', {
      alias: 'l',
      description: 'The file containing the load data to send to the nodes',
      default: './src/e2e-testing/test-data/load-data.json',
    }).argv;

  const ganache = exaca.command(`npx ts-node ${SCRIPT_DIR}/start-ganache.ts -d off`, {all: true});
  registerHandlers(ganache, 'ganache', chalk.grey);

  const servers: exaca.ExecaChildProcess<string>[] = [];

  const roles = (await jsonfile.readFile(commandArguments.roleFile)) as Record<string, RoleConfig>;

  for (const roleId of Object.keys(roles)) {
    const color = roleId === 'A' ? chalk.yellow : chalk.cyan;
    const server = exaca.command(`npx ts-node ${SCRIPT_DIR}/start-load-node.ts --role ${roleId}`, {
      all: true,
    });
    registerHandlers(server, roleId, color);
    servers.push(server);
  }

  // Wait until all the load servers are responding
  const waitOptions = {
    resources: Object.keys(roles).map(rId => `http://localhost:${roles[rId].loadServerPort}`),
  };
  await waitOn(waitOptions);

  const loadData = await jsonfile.readFile(commandArguments.loadFile);

  // Since the nodes communicate with each other we only need to talk to one node
  const {loadServerPort} = roles[Object.keys(roles)[0]];

  await got.post(`http://localhost:${loadServerPort}/load`, {json: loadData});

  // This will resolve when all the jobs have run
  await got.get(`http://localhost:${loadServerPort}/start`, {retry: 0});

  console.log(chalk.greenBright('SUCCESS!'));
  // Execa is smart enough to clean up all child processes for us
  process.exit(0);
}

/**
 * Register handlers to log out data from a child process
 * As well as handling errors
 * @param childProcess
 * @param roleId
 * @param color
 */
function registerHandlers(
  childProcess: exaca.ExecaChildProcess,
  roleId: string,
  color: chalk.Chalk
) {
  childProcess.on('error', err => {
    console.error(err);
    process.exit(1);
  });
  childProcess.on('exit', errCode => {
    console.error(`${childProcess.spawnfile} failed with error code ${errCode}`);
    process.exit(1);
  });

  childProcess.all?.on('data', data => console.log(color(`[${roleId}] ${stripNewline(data)}`)));
}

function stripNewline(data: any): string {
  if (typeof data !== 'object' || !('toString' in data)) {
    console.log(util.inspect(data));
    throw new Error(`Invalid data ${data}`);
  }

  return data.toString('utf8').replace('\n', '');
}
