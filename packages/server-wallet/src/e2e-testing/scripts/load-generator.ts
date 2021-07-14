import util from 'util';

import {CreateChannelParams, Participant} from '@statechannels/client-api-schema';
import {hexlify, hexZeroPad} from 'ethers/lib/utils';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import * as jsonfile from 'jsonfile';
import chalk from 'chalk';
import {generateSlug} from 'random-word-slugs';
import _ from 'lodash';
import {BigNumber, ethers, utils} from 'ethers';
import ms from 'ms';

import {COUNTING_APP_DEFINITION} from '../../models/__test__/fixtures/app-bytecode';
import {RoleConfig, Step} from '../types';
import {setupUnhandledErrorListeners} from '../utils';

setupUnhandledErrorListeners();

createLoad();

// TODO: This should probably be ready from the contract artifacts file
const ETH_ASSET_HOLDER_ADDRESS = '0x9eD274314f0fB37837346C425D3cF28d89ca9599';

async function createLoad() {
  const {
    closeChannels,
    amountOfUpdates,
    numberOfChannels,
    prettyOutput,
    roleFile,
    outputFile,
  } = await yargs(hideBin(process.argv))
    .option('closeChannels', {
      alias: 'c',
      default: true,
      type: 'boolean',
      describe: 'Whether channels are closed',
    })
    .option('prettyOutput', {
      default: true,
      type: 'boolean',
      describe: 'Whether the output is formatted nicely with spaces',
    })
    .option('numberOfChannels', {
      alias: 'n',
      default: 10,
      describe: 'The amount of channels that should be created.',
    })

    .option('amountOfUpdates', {
      alias: 'u',
      description:
        'The amount of updates that should be done per channel. If 0 no updates are made.',
      default: 0,
    })
    .option('roleFile', {
      alias: 'f',
      describe: 'The path to a file containing the role information',
      default: './src/e2e-testing/test-data/roles.json',
    })
    .option('outputFile', {
      alias: 'o',
      description: 'The file to write the generated load to',
      default: 'temp/test_load.json',
    }).argv;

  const roles = (await jsonfile.readFile(roleFile)) as Record<string, RoleConfig>;

  const jobIds = new Array<string>(numberOfChannels);
  const steps: Step[] = [];

  console.log(chalk.whiteBright(`Generating a test load file to  ${outputFile}`));
  console.log(
    chalk.whiteBright(
      `Using the following options ${util.inspect({
        amountOfUpdates,
        numberOfChannels,
        prettyOutput,
        closeChannels,
      })}`
    )
  );

  _.times(numberOfChannels, () => {
    // The timestamp represents when these steps should occur
    // As we add steps we keep increasing the timestamp
    let timestamp = generateRandomNumber(0, ms('10s'));
    const startIndex = generateRandomNumber(0, Object.keys(roles).length - 1);

    // Due to https://github.com/statechannels/statechannels/issues/3652 we'll run into duplicate channelIds if we use the same constants.
    // For now we re-order the participants based on who is creating the channel.
    const participants = generateParticipants(roles, startIndex);

    // Generate a jobId that is 4 random words
    const jobId = generateSlug(4);
    jobIds.push(jobId);

    steps.push({
      type: 'CreateChannel',
      jobId,
      serverId: participants[0].participantId,
      timestamp,
      channelParams: generateChannelParams(roles, participants),
    });

    // We add some time to allow the channels to be created
    if (amountOfUpdates > 0) timestamp += ms('30s');

    _.times(amountOfUpdates, async updateIndex => {
      timestamp += generateRandomNumber(ms('5s'), ms('30s'));
      steps.push({
        type: 'UpdateChannel',
        serverId: participants[updateIndex % participants.length].participantId,
        jobId,
        timestamp,
        updateParams: {
          appData: hexZeroPad(hexlify(updateIndex), 32),
          allocations: generateChannelParams(roles, participants).allocations,
        },
      });
    });
    if (closeChannels) {
      // Allow some time for updates or channel creation to be done before closing
      timestamp += ms('30s');

      steps.push({
        type: 'CloseChannel',
        jobId,
        serverId: participants[0].participantId,
        timestamp,
      });
    }
  });

  await jsonfile.writeFile(outputFile, steps, {spaces: prettyOutput ? 1 : 0});
  console.log(chalk.greenBright(`Complete!`));
}

function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Generates participants based on roles. Uses the startIndex to determine the order of the participants.
 * This may no longer be needed after https://github.com/statechannels/statechannels/issues/3652
 * @param roles The record containing role configs
 * @param startIndex The index of the role we should start at
 * @returns A collection of participants
 */
function generateParticipants(roles: Record<string, RoleConfig>, startIndex: number) {
  // Flatten out the Record into a simple array
  const roleArray = Object.keys(roles).map(rId => ({roleId: rId, ...roles[rId]}));

  const participants: Participant[] = [];

  // We iterate through the role  array starting at start index and add the role to the participants
  for (let i = 0; i < roleArray.length; i++) {
    const role = roleArray[(i + startIndex) % roleArray.length];

    const {address: signingAddress} = new ethers.Wallet(role.privateKey);
    const {address: destinationAddress} = new ethers.Wallet(role.chainPrivateKey);
    const destination = hexZeroPad(destinationAddress, 32);

    participants.push({signingAddress, participantId: role.roleId, destination});
  }

  return participants;
}

/**
 * Creates channel parameters based on the provided roles and participants.
 * @param roles
 * @param participants
 * @returns A CreateChannelParams object that can be passed into createChannel
 */
function generateChannelParams(
  roles: Record<string, RoleConfig>,
  participants: Participant[]
): CreateChannelParams {
  // Eventually these should vary
  const allocationItems = participants.map(p => ({
    destination: p.destination,
    amount: BigNumber.from(5).toHexString(),
  }));

  return {
    participants,
    allocations: [
      {
        allocationItems,
        assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      },
    ],
    appDefinition: COUNTING_APP_DEFINITION,
    appData: utils.hexZeroPad('0x0', 32),
    fundingStrategy: 'Direct',
    challengeDuration: ms('1d') / 1000, // This is 1 day in seconds,
  };
}
