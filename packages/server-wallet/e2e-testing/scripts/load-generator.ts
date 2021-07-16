import util from 'util';

import {CreateChannelParams, Participant} from '@statechannels/client-api-schema';
import {hexZeroPad} from 'ethers/lib/utils';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import * as jsonfile from 'jsonfile';
import chalk from 'chalk';
import {generateSlug} from 'random-word-slugs';
import _ from 'lodash';
import {BigNumber, ethers, utils} from 'ethers';
import ms from 'ms';

import {COUNTING_APP_DEFINITION} from '../../src/models/__test__/fixtures/app-bytecode';
import {RoleConfig, Step} from '../types';
import {setupUnhandledErrorListeners} from '../utils';

setupUnhandledErrorListeners();

createLoad();

// TODO: This should probably be ready from the contract artifacts file
const ETH_ASSET_HOLDER_ADDRESS = '0x9eD274314f0fB37837346C425D3cF28d89ca9599';

async function createLoad() {
  const {
    createRate,
    prettyOutput,
    roleFile,
    outputFile,
    createWait,
    closeRate,
    duration,
  } = await yargs(hideBin(process.argv))
    .option('prettyOutput', {
      default: true,
      type: 'boolean',
      describe: 'Whether the output is formatted nicely with spaces',
    })
    .option('roleFile', {
      alias: 'f',
      describe: 'The path to a file containing the role information',
      default: './e2e-testing/test-data/roles.json',
    })
    .option('duration', {
      alias: 'd',
      default: 30,
      describe: 'The  amount of time (in seconds) that the load should run for.',
    })
    .option('createRate', {
      alias: 'cr',
      default: 5,
      describe: 'The amount of channels that should be created per a sseonc.',
    })
    .option('createWait', {
      default: 5,
      describe:
        'The minumum amount of time to wait for a channel be fully open, before attempting another step',
    })
    .option('closeRate', {
      default: 5,
      describe: 'The amount of channels to be closed per a second.',
    })
    .option('outputFile', {
      alias: 'o',
      description: 'The file to write the generated load to',
      default: 'temp/test_load.json',
    }).argv;

  const roles = (await jsonfile.readFile(roleFile)) as Record<string, RoleConfig>;

  const jobIds = new Array<string>();
  const steps: Step[] = [];

  console.log(chalk.whiteBright(`Generating a test load file to  ${outputFile}`));
  console.log(
    chalk.whiteBright(
      `Using the following options ${util.inspect({
        duration,
        createRate,
        closeRate,
        createWait,
      })}`
    )
  );

  if (closeRate >= createRate) {
    console.log(
      chalk.yellow('The close rate is larger than the create rate! All channels will end up closed')
    );
  }

  _.times(createRate * duration, () => {
    // The timestamp represents when these steps should occur
    // As we add steps we keep increasing the timestamp
    const timestamp = generateRandomNumber(0, toMilliseconds(duration));
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
  });
  if (closeRate > 0) {
    _.times(closeRate * duration, () => {
      const createStep = getRandomStepToClose(steps);
      if (createStep) {
        const timestamp = Math.max(
          generateRandomNumber(createStep.timestamp, toMilliseconds(duration)),
          createStep.timestamp + toMilliseconds(createWait)
        );

        steps.push({
          type: 'CloseChannel',
          jobId: createStep.jobId,
          serverId: createStep.serverId,
          timestamp,
        });
      }
    });
  }
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

function toMilliseconds(num: number): number {
  return num * 1000;
}

function getRandomStepToClose(steps: Step[]): Step | undefined {
  const jobsAlreadyWithClose = steps.filter(s => s.type === 'CloseChannel').map(s => s.jobId);
  const filtered = steps
    .filter(s => s.jobId)
    .filter(s => s.type === 'CreateChannel' && !jobsAlreadyWithClose.includes(s.jobId));
  const index = generateRandomNumber(0, filtered.length - 1);
  return filtered[index];
}
