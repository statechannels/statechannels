import util from 'util';

import execa from 'execa';
import jsonfile from 'jsonfile';
import waitOn from 'wait-on';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import chalk from 'chalk';
import got from 'got';

import {RoleConfig} from '../types';

const SCRIPT_DIR = './e2e-testing/scripts';

startAll();

async function startAll() {
  const commandArguments = await yargs(hideBin(process.argv))
    .option('roleFile', {
      alias: 'f',
      describe: 'The path to a file containing the role information',
      default: './e2e-testing/test-data/roles.json',
    })
    .option('loadFile', {
      alias: 'l',
      description: 'The file containing the load data to send to the nodes',
      demandOption: 'true',
      type: 'string',
    })
    .option('meanDelay', {
      default: 0,
      describe:
        'The mean delay (in MS) that the node will wait before attempting to send a message. If undefined or 0 no delays are added.',
      type: 'number',
    })
    .option('dropRatePercentage', {
      default: 0,
      min: 0,
      max: 100,
      describe: 'The percentage of messages that get dropped when trying to send a message.',
    }).argv;

  const ganache = execa.command(`npx ts-node ${SCRIPT_DIR}/start-ganache.ts -d off`, {all: true});
  registerHandlers(ganache, 'ganache', chalk.grey);

  const servers: execa.ExecaChildProcess<string>[] = [];

  const roles = (await jsonfile.readFile(commandArguments.roleFile)) as Record<string, RoleConfig>;
  const {dropRatePercentage, meanDelay} = commandArguments;
  for (const roleId of Object.keys(roles)) {
    const color = roleId === 'A' ? chalk.yellow : chalk.cyan;
    const server = execa.command(
      `npx ts-node ${SCRIPT_DIR}/start-load-node.ts --role ${roleId} --dropRatePercentage ${dropRatePercentage} --meanDelay ${meanDelay}`,
      {
        all: true,
      }
    );
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

  // Wrap up all the existing processes
  servers.forEach(s => s.cancel());
  ganache.cancel();

  // Run the sanity checker
  const {
    stdout,
    stderr,
    exitCode,
  } = await execa.command(
    `npx ts-node ${SCRIPT_DIR}/sanity-checker.ts -l ${commandArguments.loadFile}`,
    {env: {FORCE_COLOR: 'true'}}
  );

  console.log(stdout);

  if (exitCode !== 0) {
    console.error(stderr);
    process.exit(exitCode);
  }

  console.log(chalk.greenBright('SUCCESS!'));
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
  childProcess: execa.ExecaChildProcess,
  roleId: string,
  color: chalk.Chalk
) {
  childProcess.on('error', err => {
    console.error(err);
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
