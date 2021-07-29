import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';
import {TEST_ACCOUNTS} from '@statechannels/devtools';
import jsonfile, {writeFile} from 'jsonfile';
import ganache from 'ganache-core';
import {ethers} from 'ethers';
import {waitUntilUsed} from 'tcp-port-used';
import chalk from 'chalk';
import _ from 'lodash';
import ms from 'ms';
import exitHook from 'async-exit-hook';

import {deploy, TestNetworkContext} from '../../deployment/deploy';
import {getRoles, setupUnhandledErrorListeners} from '../utils';
import {ChainState} from '../types';

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
      default: './temp/contract_artifacts.json',
    })
    .option('chainStateFile', {default: './temp/chain-state-file.json'})
    .option('roleFile', {
      alias: 'f',
      describe: 'The path to a file containing the role information',
      default: './e2e-testing/test-data/roles.json',
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

  setupUnhandledErrorListeners();
  // ganache registers handlers for these events and intercepts them
  // We want to avoid this so we can write out results before exiting so we remove all existing listeners
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('beforeExit');

  console.log(chalk.green(`Contract artifacts written to ${commandArguments.artifactFile}`));

  const roles = await getRoles(commandArguments.roleFile);
  const destinations = Object.keys(roles).map(rId => roles[rId].destination);

  // exitHook will run when the process gets terminated for whatever reason
  exitHook(done =>
    writeBalances(
      destinations,
      deployResults,
      commandArguments.port,
      commandArguments.chainStateFile
    ).then(() => {
      server.close();
      done();
    })
  );
}

async function writeBalances(
  destinations: string[],
  deployResults: TestNetworkContext,
  ganachePort: number,
  chainStateFile: string
) {
  const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${ganachePort}`);

  const accounts: ChainState['accounts'] = {};

  for (const address of destinations) {
    const balance = (await provider.getBalance(address)).toHexString();
    accounts[address] = balance;
  }

  const contractBalance = await (
    await provider.getBalance(deployResults.ETH_ASSET_HOLDER_ADDRESS)
  ).toHexString();

  const contracts: ChainState['contracts'] = {
    ETH_ASSET_HOLDER_ADDRESS: {
      address: deployResults.ETH_ASSET_HOLDER_ADDRESS,
      balance: contractBalance,
    },
  };

  await jsonfile.writeFile(chainStateFile, {accounts, contracts});
  console.log(`Wrote account balances to file ${chainStateFile}`);
}
