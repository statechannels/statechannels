import {CreateChannelParams} from '@statechannels/client-api-schema';
import {hexlify, hexZeroPad} from 'ethers/lib/utils';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import * as jsonfile from 'jsonfile';
import chalk from 'chalk';

import {Step} from './types';
import {setupUnhandledErrorListeners} from './utils';

setupUnhandledErrorListeners();
createLoad();

const DEFAULT_CHANNEL_PARAMS: CreateChannelParams = {
  participants: [
    {
      signingAddress: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf',
      participantId: 'a',
      destination: '0x00000000000000000000000050Bcf60D1d63B7DD3DAF6331a688749dCBD65d96',
    },
    {
      signingAddress: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9',
      participantId: 'b',
      destination: '0x000000000000000000000000632d0b05c78A83cEd439D3bd6C710c4814D3a6db',
    },
  ],
  allocations: [
    {
      allocationItems: [
        {
          destination: '0x00000000000000000000000050Bcf60D1d63B7DD3DAF6331a688749dCBD65d96',
          amount: '0x03',
        },
        {
          destination: '0x000000000000000000000000632d0b05c78A83cEd439D3bd6C710c4814D3a6db',
          amount: '0x02',
        },
      ],
      assetHolderAddress: '0x9eD274314f0fB37837346C425D3cF28d89ca9599',
    },
  ],
  appDefinition: '0x0000000000000000000000000000000000000001',
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  fundingStrategy: 'Direct',
  challengeDuration: 86400,
};
async function createLoad() {
  const commandArguments = await yargs(hideBin(process.argv))
    .option('numberOfChannels', {
      alias: 'c',
      default: 100,
      describe: 'The amount of channels that should be created',
      max: 1_000_000,
      min: 1,
    })
    .option('amountOfUpdates', {
      alias: 'u',
      description: 'The duration(in ms) for how often a block should be mined.',
      default: 2_000,
    })

    .option('outputFile', {
      alias: 'o',
      description: 'The file to write the generated load to',
      default: 'temp/test_load.json',
    }).argv;

  const jobIds = new Array<string>(commandArguments.numberOfChannels);
  const steps: Step[] = [];
  console.log(
    chalk.whiteBright(
      `Generating a test load file: '${commandArguments.outputFile}' with ${commandArguments.numberOfChannels} channels and ${commandArguments.amountOfUpdates} updates`
    )
  );
  for (let channelIndex = 0; channelIndex < commandArguments.numberOfChannels; channelIndex++) {
    // TODO: A shouldn't always create and close
    const jobId = `JOB-${channelIndex}-${Date.now()}`;
    jobIds.push(jobId);
    steps.push({
      type: 'CreateChannel',
      jobId,
      serverId: 'A',
      step: 1,
      channelParams: DEFAULT_CHANNEL_PARAMS,
    });
    for (let updateIndex = 2; updateIndex < commandArguments.amountOfUpdates + 2; updateIndex++) {
      steps.push({
        type: 'UpdateChannel',
        serverId: updateIndex % 2 === 0 ? 'A' : 'B',
        jobId,
        step: updateIndex,
        updateParams: {
          appData: hexZeroPad(hexlify(updateIndex), 32),
          allocations: DEFAULT_CHANNEL_PARAMS.allocations,
        },
      });
    }
    steps.push({
      type: 'CloseChannel',
      jobId,
      serverId: 'A',
      step: commandArguments.amountOfUpdates + 2,
    });
  }
  await jsonfile.writeFile(commandArguments.outputFile, steps);
  console.log(chalk.greenBright(`Complete!`));
}
