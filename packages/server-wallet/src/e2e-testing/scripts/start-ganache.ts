import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';
import {TEST_ACCOUNTS} from '@statechannels/devtools';
import {writeFile} from 'jsonfile';
import ganache from 'ganache-core';
import {ethers} from 'ethers';
import {waitUntilUsed} from 'tcp-port-used';
import chalk from 'chalk';
import _ from 'lodash';
import ms from 'ms';

import {deploy} from '../../../deployment/deploy';
import {setupUnhandledErrorListeners} from '../utils';

setupUnhandledErrorListeners();
setupGanache();

async function setupGanache() {
  const commandArguments = await yargs(hideBin(process.argv))
    .option('port', {
      alias: 'p',
      default: 8545,
      describe: 'port for the ganache server to run on',
    })
    .option('miningInterval', {
      alias: 'mi',
      description: 'The duration(in ms) for how often a block should be mined.',
      default: ms('2s'),
    })
    .option('displayGanacheOutput', {
      alias: 'd',
      description: 'Whether or not ganache output is displayed',
      choices: ['verbose', 'normal', 'off'],
      coerce: (arg: string) => arg.toLocaleLowerCase(),
      default: 'normal',
    })
    .option('chainId', {alias: 'c', description: 'The chain id to use', default: 9001})
    .option('artifactFile', {
      alias: 'af',
      description: 'The file to write the artifacts to',
      default: 'temp/contract_artifacts.json',
    }).argv;

  // ganache core exports a very permissive object[] type for accounts
  // it should be {balance: HexString, secretKey: string}[]
  const serverOptions: ganache.IServerOptions = {
    network_id: commandArguments.chainId,
    networkId: commandArguments.chainId,
    logger: {
      log: (msg: string) =>
        commandArguments.displayGanacheOutput === 'off' ? _.noop() : console.log(chalk.gray(msg)),
    },
    port: commandArguments.port,

    accounts: TEST_ACCOUNTS.map(a => ({
      balance: ethers.utils.parseEther('1000000').toHexString(),
      secretKey: a.privateKey,
    })),
    gasLimit: 10_000_000,
    gasPrice: '0x1',
    verbose: commandArguments.displayGanacheOutput === 'verbose',
  };
  // These seem to be needed to get ganache to use the correct chain id
  const workaroundOptions = {
    _chainId: commandArguments.chainId,
    _chainIdRpc: commandArguments.chainId,
  };

  const server = ganache.server({...serverOptions, ...workaroundOptions});
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  server.listen(commandArguments.port, () => {});

  await waitUntilUsed(commandArguments.port, 500, ms('10s'));

  // While ganache supports time based mining it disables auto mining after contract calls
  // By sending the mine instructions ourselves we get the best of both worlds
  setInterval(() => {
    const payload = {id: Date.now(), jsonrpc: '2.0', method: 'evm_mine', params: []};

    server.provider.send(payload, (err, _result) => {
      if (err) {
        throw err;
      }
    });
  }, commandArguments.miningInterval);

  console.log(chalk.green(`Ganache started on port ${commandArguments.port}`));

  const endpoint = `http://localhost:${commandArguments.port}`;

  // Deploy the contracts and output to the artifact file
  const deployResults = await deploy(endpoint);
  await writeFile(commandArguments.artifactFile, deployResults);

  console.log(chalk.green(`Contract artifacts written to ${commandArguments.artifactFile}`));
}
