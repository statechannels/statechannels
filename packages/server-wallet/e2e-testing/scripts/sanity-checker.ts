import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import jsonfile from 'jsonfile';
import chalk from 'chalk';
import {BN} from '@statechannels/wallet-core';
import {Uint256} from '@statechannels/nitro-protocol';
import _ from 'lodash';
import {BigNumberish, utils} from 'ethers';
import columnify from 'columnify';

import {ChainState, RoleConfig, Step} from '../types';
import {defaultTestWalletConfig, overwriteConfigWithDatabaseConnection} from '../../src';
import {getKnexFromConfig} from '../../src/db-admin/db-admin';
import {ObjectiveModel} from '../../src/models/objective';
import {Channel} from '../../src/models/channel';
import {setupUnhandledErrorListeners} from '../utils';

setupUnhandledErrorListeners();
assertSanity();

async function assertSanity() {
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
  console.log(
    chalk.yellow(
      `Using load file ${chalk.bold(commandArguments.loadFile)} to generate expected values`
    )
  );
  const roles = (await jsonfile.readFile(commandArguments.roleFile)) as Record<string, RoleConfig>;
  const chainStateFile = (await jsonfile.readFile(commandArguments.chainStateFile)) as ChainState;

  for (const roleId of Object.keys(roles)) {
    console.log(chalk.bold(`Checking ${roles[roleId].databaseName} for server ${roleId}`));
    const assertions = await checkServer(steps, roles[roleId], chainStateFile);

    const failures = assertions.filter(a => !BN.eq(a.expected, a.actual));
    const successes = assertions.filter(a => BN.eq(a.expected, a.actual));

    console.log(
      columnify(successes, {
        dataTransform: data => chalk.green(data),
      })
    );

    if (failures.length > 0) {
      console.log(chalk.redBright('ASSERTIONS FAILED'));
      console.log(
        columnify(failures, {
          dataTransform: data => chalk.red(data),
        })
      );

      process.exit(1);
    }
  }
  process.exit(0);
}

async function checkChain(chainState: ChainState, channels: Channel[]): Promise<Assertion[]> {
  const closedChannels = channels.filter(c => c.hasConclusionProof);
  const openChannels = channels.filter(c => !c.hasConclusionProof);

  const closedFunds = closedChannels.map(c => c.myAmount).reduce(BN.add, '0x0' as Uint256);

  const fundsStillOnChain = openChannels
    .map(c => BN.add(c.myAmount, c.opponentAmount))
    .reduce(BN.add, '0x0' as Uint256);

  const myAddresses = Array.from(
    // TODO: There's probably a method somewhere to convert from destination to address
    new Set(channels.map(c => utils.hexDataSlice(c.myParticipantInfo.destination, 32 - 20)))
  );

  const myTotal = myAddresses.map(d => chainState.accounts[d]).reduce(BN.add, '0x0');

  const adjudicatorFunds = chainState.contracts.NITRO_ADJUDICATOR_ADDRESS.balance;

  return [
    createAssertion(closedFunds, myTotal, `Funds sent to this node's destination`),
    createAssertion(fundsStillOnChain, adjudicatorFunds, 'Adjudicator funds'),
  ];
}

async function checkServer(
  steps: Step[],
  role: RoleConfig,
  chainState: ChainState
): Promise<Assertion[]> {
  const {databaseName} = role;

  const knex = getKnexFromConfig(
    overwriteConfigWithDatabaseConnection(defaultTestWalletConfig(), {database: databaseName})
  );
  const objectives = await ObjectiveModel.query(knex);
  const channels = await Channel.query(knex);

  const expectedAppChannelCount = steps.filter(s => s.type === 'CreateChannel').length;

  const actualOpenChannelObjectiveCount = objectives.filter(
    o => o.type === 'OpenChannel' && (o as any).data.role === 'app' && o.status === 'succeeded'
  ).length;

  const assertions: Array<Assertion> = [];
  assertions.push(
    createAssertion(
      expectedAppChannelCount,
      actualOpenChannelObjectiveCount,
      'Completed OpenChannel objectives in the DB'
    )
  );

  const actualAppChannelCount = channels.filter(c => !c.isLedgerChannel).length;
  assertions.push(
    createAssertion(expectedAppChannelCount, actualAppChannelCount, 'Open app channels in the DB')
  );
  const expectedClosedCount = steps.filter(s => s.type === 'CloseChannel').length;
  const actualClosedChannelCount = channels.filter(c => c.isAppChannel && c.hasConclusionProof)
    .length;
  const acualCloseChannelObjectiveCount = objectives.filter(
    o => o.type === 'CloseChannel' && o.status === 'succeeded'
  ).length;
  assertions.push(
    createAssertion(expectedClosedCount, actualClosedChannelCount, 'Closed app channels in the DB')
  );

  assertions.push(
    createAssertion(
      expectedClosedCount,
      acualCloseChannelObjectiveCount,
      'Completed CloseChannel objectives in the DB'
    )
  );

  const expectedLedgerChannelCount = steps.filter(s => s.type === 'CreateLedgerChannel').length;
  const actualLedgerChannelCount = channels.filter(c => c.isLedger).length;
  assertions.push(
    createAssertion(
      expectedLedgerChannelCount,
      actualLedgerChannelCount,
      'Ledger channels in the DB'
    )
  );
  const chainAssertions = await checkChain(chainState, channels);
  return _.concat(assertions, chainAssertions);
}

function createAssertion(
  expected: BigNumberish,
  actual: BigNumberish,
  description: string
): Assertion {
  return {description, expected, actual};
}

type Assertion = {expected: BigNumberish; actual: BigNumberish; description: string};
