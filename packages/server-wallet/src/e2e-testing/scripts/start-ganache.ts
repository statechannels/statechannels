import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';
import {GanacheServer, TEST_ACCOUNTS} from '@statechannels/devtools';
import pino from 'pino';
import {writeFile} from 'jsonfile';

import {deploy} from '../../../deployment/deploy';
setupGanache();

async function setupGanache() {
  const commandArguments = await yargs(hideBin(process.argv))
    .option('port', {
      alias: 'p',

      default: 8545,
      describe: 'port for the ganache server to run on',
    })
    .option('chainId', {alias: 'c', description: 'The chain id to use', default: 9001})
    .option('artifactFile', {
      alias: 'af',
      description: 'The file to write the artifacts to',
      default: 'contract_artifacts.json',
    }).argv;
  // eslint-disable-next-line no-process-env
  process.env.GANACHE_PORT = commandArguments.port.toString();
  const logger = pino({level: 'trace'});
  const server = new GanacheServer(
    commandArguments.port,
    commandArguments.chainId,
    TEST_ACCOUNTS,
    10_000, // timeout
    10_00_000_000, // gasLimit
    1, // gasPrice
    logger
  );

  await server.ready();

  const deployResults = await deploy();
  writeFile(commandArguments.artifactFile, deployResults);
}
