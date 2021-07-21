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
import {zeroAddress} from '@statechannels/wallet-core/src/config';

import {COUNTING_APP_DEFINITION} from '../../src/models/__test__/fixtures/app-bytecode';
import {FundingInfo, RoleConfig, Step} from '../types';
import {setupUnhandledErrorListeners} from '../utils';

setupUnhandledErrorListeners();

createLoad();

async function createLoad() {
  const {
    createRate,
    prettyOutput,
    roleFile,
    outputFile,
    closeRate,
    duration,
    closeDelay,
    fundingStrategy,
    ledgerDelay,
    ledgerRate,
    createLedgerDuration,
  } = await yargs(hideBin(process.argv))
    .option('prettyOutput', {
      default: true,
      type: 'boolean',
      describe: 'Whether the output is formatted nicely with spaces.',
    })
    .option('outputFile', {
      alias: 'o',
      description: 'The file to write the generated load to.',
      default: 'temp/test_load.json',
    })
    .option('roleFile', {
      alias: 'rf',
      describe: 'The path to a file containing the role information.',
      default: './e2e-testing/test-data/roles.json',
    })
    .option('fundingStrategy', {
      alias: 'f',
      describe: 'Whether channels are funded directly or by ledger channels.',
      choices: ['Ledger', 'Direct'],
      demandOption: true,
    })
    .option('duration', {
      alias: 'd',
      min: 10,
      default: 60,
      describe: `The amount of time (in seconds) that the load should run for.
      This dictactes the max timestamp a step can have.`,
    })
    .option('createRate', {
      alias: 'cr',
      min: 1,
      default: 1,
      describe: 'The number of channels that should be created per a second.',
    })
    .option('createLedgerDuration', {
      default: 15,
      min: 5,
      describe: `The amount of time (in seconds) that create ledger channels can be scheduled for.
      This dictactes the max timestamp a step can have.`,
    })
    .option('ledgerRate', {
      default: 1,
      min: 1,
      describe: `The number of ledger channels to create per a second during the createLedgerDuration.`,
    })
    .option('ledgerDelay', {
      default: 15,
      min: 0,
      describe: `The minumum amount of time (in seconds) to wait for a ledger channel to be created before scheduling a createChannel job.`,
    })
    .option('closeDelay', {
      default: 5,
      min: 0,
      describe: `The minumum amount of time (in seconds) to wait before closing a channel.`,
    })
    .option('closeRate', {
      default: 0,
      min: 0,
      describe:
        'The amount of channels to be closed per a second. If this is larger than the createRate then all channels will eventually get closed. Otherwise, some channels will remain open.',
    }).argv;

  const roles = (await jsonfile.readFile(roleFile)) as Record<string, RoleConfig>;

  console.log(chalk.whiteBright(`Generating a test load file to  ${outputFile}`));
  console.log(
    chalk.whiteBright(
      `Using the following options ${util.inspect({
        outputFile,
        roleFile,
        duration,
        createRate,
        closeRate,
        closeDelay,
        fundingStrategy,
        ledgerDelay,
        ledgerRate,
        createLedgerDuration,
      })}`
    )
  );

  console.log(chalk.whiteBright(`${createRate * duration} will be created.`));
  console.log(
    chalk.whiteBright(
      `${
        closeRate * duration > 0 ? closeRate * duration : 'None'
      } of those channels will be closed.`
    )
  );
  if (closeRate >= createRate) {
    console.log(
      chalk.yellow(
        'The close rate is equal to or larger than the create rate! All channels will end up closed!'
      )
    );
  }

  let steps: Step[] = [];
  if (fundingStrategy === 'Ledger') {
    steps = generateCreateLedgerSteps(ledgerRate, createLedgerDuration, roles);
  }
  steps = generateCreateSteps(
    createRate,
    duration,
    roles,
    fundingStrategy === 'Ledger' ? {type: 'Ledger', ledgerDelay} : {type: 'Direct'},
    steps
  );

  steps = generateCloseSteps(closeRate, duration, closeDelay, steps);

  await jsonfile.writeFile(outputFile, steps, {spaces: prettyOutput ? 1 : 0});

  console.log(chalk.greenBright(`Complete!`));
}

function generateCreateLedgerSteps(
  ledgerRate: number,
  duration: number,
  roles: Record<string, RoleConfig>
): Step[] {
  const steps: Step[] = [];
  _.times(ledgerRate * duration, () => {
    const timestamp = generateRandomNumber(0, toMilliseconds(duration));
    const startIndex = generateRandomNumber(0, Object.keys(roles).length - 1);

    const participants = generateParticipants(roles, startIndex);

    // Generate a jobId that is 4 random words
    const jobId = generateSlug(4);

    steps.push({
      type: 'CreateLedgerChannel',
      jobId,
      serverId: participants[0].participantId,
      timestamp,
      // We want well funded ledger channels
      ledgerChannelParams: generateChannelParams(participants, 100_000),
    });
  });

  return steps;
}

function generateCloseSteps(
  closeRate: number,
  duration: number,
  closeDelay: number,
  previousSteps: Readonly<Step[]>
): Step[] {
  // TODO: We cast this so we can mutate the cloned array
  const steps = _.clone(previousSteps) as Step[];

  if (closeRate > 0) {
    _.times(closeRate * duration, () => {
      const createStep = getRandomJobToClose(previousSteps);

      if (createStep) {
        // We want a close timestamp that occurs at least closeDelay time after the create time
        const timestamp = Math.max(
          generateRandomNumber(createStep.timestamp, toMilliseconds(duration)),
          createStep.timestamp + toMilliseconds(closeDelay)
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
  return steps;
}

function generateCreateSteps(
  createRate: number,
  duration: number,
  roles: Record<string, RoleConfig>,
  funding: {type: 'Ledger'; ledgerDelay: number} | {type: 'Direct'},

  previousSteps: readonly Step[]
): Step[] {
  const steps = _.clone(previousSteps) as Step[];
  const ledgerSteps = steps.filter(s => s.type === 'CreateLedgerChannel');
  _.times(createRate * duration, () => {
    const startIndex = generateRandomNumber(0, Object.keys(roles).length - 1);

    // Due to https://github.com/statechannels/statechannels/issues/3652 we'll run into duplicate channelIds if we use the same constants.
    // For now we re-order the participants based on who is creating the channel.
    const participants = generateParticipants(roles, startIndex);

    // Generate a jobId that is 4 random words
    const jobId = generateSlug(4);

    let timestamp;
    let fundingInfo: FundingInfo;
    if (funding.type === 'Ledger') {
      const ledgerToUse = getRandomElement(ledgerSteps);
      // We want to wait ledgerDelay before attempting to use the ledger channel
      timestamp = generateRandomNumber(
        ledgerToUse.timestamp + funding.ledgerDelay,
        toMilliseconds(duration)
      );
      fundingInfo = {type: 'Ledger', fundingLedgerJob: ledgerToUse.jobId};
    } else {
      timestamp = generateRandomNumber(0, toMilliseconds(duration));
      fundingInfo = {type: 'Direct'};
    }

    steps.push({
      type: 'CreateChannel',
      jobId,
      serverId: participants[0].participantId,
      timestamp,
      // We want a well funded ledger channel
      channelParams: generateChannelParams(participants),
      fundingInfo,
    });
  });

  return steps;
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
  participants: Participant[],
  fundingAmountPerParticipant = 5
): Omit<CreateChannelParams, 'fundingStrategy'> {
  // Eventually these should vary
  const allocationItems = participants.map(p => ({
    destination: p.destination,
    amount: BigNumber.from(fundingAmountPerParticipant).toHexString(),
  }));

  return {
    participants,
    allocations: [
      {
        allocationItems,
        asset: zeroAddress,
      },
    ],
    appDefinition: COUNTING_APP_DEFINITION,
    appData: utils.hexZeroPad('0x0', 32),

    challengeDuration: ms('1d') / 1000, // This is 1 day in seconds,
  };
}

/**
 * Converts seconds to milliseconds
 */
function toMilliseconds(seconds: number): number {
  return seconds * 1000;
}

function getRandomElement<T>(array: Array<T>): T {
  const index = generateRandomNumber(0, array.length - 1);
  return array[index];
}

/**
 * Gets a random job that doesn't already have a close step scheduled
 */
function getRandomJobToClose(
  steps: readonly Step[]
): Pick<Step, 'jobId' | 'timestamp' | 'serverId'> | undefined {
  const jobsAlreadyWithClose = steps.filter(s => s.type === 'CloseChannel').map(s => s.jobId);

  // We only want jobs that don't have a close channel step yet
  const filtered = steps.filter(
    s => s.type === 'CreateChannel' && !jobsAlreadyWithClose.includes(s.jobId)
  );

  const index = generateRandomNumber(0, filtered.length - 1);
  return filtered[index];
}
