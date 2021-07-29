import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import jsonfile from 'jsonfile';
import chalk from 'chalk';
import {BN} from '@statechannels/wallet-core';
import {Uint256} from '@statechannels/nitro-protocol';
import _ from 'lodash';
import {utils} from 'ethers';

import {ChainState, RoleConfig, Step} from '../types';
import {defaultTestWalletConfig, overwriteConfigWithDatabaseConnection} from '../../src';
import {getKnexFromConfig} from '../../src/db-admin/db-admin';
import {ObjectiveModel} from '../../src/models/objective';
import {Channel} from '../../src/models/channel';
import {setupUnhandledErrorListeners} from '../utils';

setupUnhandledErrorListeners();
checkDatabase();

async function checkDatabase() {
  const commandArguments = await yargs(hideBin(process.argv))
    .option('roleFile', {
      alias: 'f',
      describe: 'The path to a file containing the role information',
      default: './e2e-testing/test-data/roles.json',
    })
    .option('chainStateFile', {default: './temp/chain-state-file.json'})
    .option('loadFile', {
      alias: 'l',
      description: 'The file containing the load data to send to the nodes',
      default: './e2e-testing/test-data/load-data.json',
    }).argv;

  const steps = (await jsonfile.readFile(commandArguments.loadFile)) as Step[];
  const roles = (await jsonfile.readFile(commandArguments.roleFile)) as Record<string, RoleConfig>;
  const chainStateFile = (await jsonfile.readFile(commandArguments.chainStateFile)) as ChainState;

  for (const roleId of Object.keys(roles)) {
    await checkServer(steps, roles[roleId], chainStateFile);
  }
}

async function checkChain(chainState: ChainState, channels: Channel[]) {
  const closedChannels = channels.filter(c => c.isAppChannel && c.hasConclusionProof);
  const openChannels = channels.filter(c => c.isAppChannel && !c.hasConclusionProof);

  const closedFunds = closedChannels.map(c => c.myAmount).reduce(BN.add, '0x0' as Uint256);

  const fundsStillOnChain = openChannels
    .map(c => BN.add(c.myAmount, c.opponentAmount))
    .reduce(BN.add, '0x0' as Uint256);

  const myAddresses = Array.from(
    // TODO: There's probably a method somewhere to convert from destination to address
    new Set(channels.map(c => utils.hexDataSlice(c.myParticipantInfo.destination, 32 - 20)))
  );

  const myTotal = myAddresses.map(d => chainState.accounts[d]).reduce(BN.add, '0x0');

  const assetHolderFunds = chainState.contracts.ETH_ASSET_HOLDER_ADDRESS.balance;

  check(closedFunds, myTotal, 'Received Funds on chain');
  check(fundsStillOnChain, assetHolderFunds, 'Funds still locked on chain');
}

async function checkServer(steps: Step[], role: RoleConfig, chainState: ChainState) {
  const {databaseName} = role;
  console.log(chalk.bold(`Checking ${databaseName}`));
  const knex = getKnexFromConfig(
    overwriteConfigWithDatabaseConnection(defaultTestWalletConfig(), {database: databaseName})
  );
  const objectives = await ObjectiveModel.query(knex);
  const channels = await Channel.query(knex);

  const expectedAppChannelCount = steps.filter(s => s.type === 'CreateChannel').length;

  const actualOpenChannelObjectiveCount = objectives.filter(
    o => o.type === 'OpenChannel' && (o as any).data.role === 'app'
  ).length;

  check(expectedAppChannelCount, actualOpenChannelObjectiveCount, 'OpenChannel Objectives');

  const actualAppChannelCount = channels.filter(c => !c.isLedgerChannel).length;

  check(expectedAppChannelCount, actualAppChannelCount, 'App Channels');

  const expectedClosedChannelCount = steps.filter(s => s.type === 'CloseChannel').length;
  const actualClosedChannelCount = channels.filter(c => c.isAppChannel && !c.isRunning).length;

  check(expectedClosedChannelCount, actualClosedChannelCount, 'Closed Channels');

  await checkChain(chainState, channels);
}

function check<T>(expected: T, actual: T, description: string) {
  console.log(chalk.yellow(description));
  if (expected !== actual) {
    console.error(chalk.red(`Expected ${expected} but received ${actual}`));
    process.exit(1);
  } else {
    console.log(chalk.green(`Expected and found ${expected}`));
  }
}
