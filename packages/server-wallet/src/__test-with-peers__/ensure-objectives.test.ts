import {CreateChannelParams} from '@statechannels/client-api-schema';

import {
  getPeersSetup,
  messageService,
  participantA,
  participantB,
  peersTeardown,
  peerEngines,
} from '../../jest/with-peers-setup-teardown';
import {Wallet} from '../wallet';
import {LatencyOptions} from '../message-service/test-message-service';
import {WalletObjective} from '../models/objective';
import {createChannelArgs} from '../engine/__test__/fixtures/create-channel';

// These tests can take quite a long time if we're unlucky
jest.setTimeout(120_000);

beforeAll(getPeersSetup());
afterAll(peersTeardown);

function getCreateChannelsArgs(): CreateChannelParams {
  return createChannelArgs({
    participants: [participantA, participantB],
    fundingStrategy: 'Fake',
  });
}

describe('EnsureObjectives', () => {
  // This is the percentages of messages that get dropped
  const testCases: LatencyOptions[] = [
    // No latency/message dropping
    {
      dropRate: 0,
      meanDelay: undefined,
    },
    // Lots of messages dropping but no delay
    {dropRate: 0.3, meanDelay: undefined},
    // delay but no dropping
    {dropRate: 0, meanDelay: 200},
    // Delay and drop
    {dropRate: 0.1, meanDelay: 100},
  ];
  test.each(testCases)(
    'can successfully create a channel with the latency options: %o',
    async options => {
      messageService.setLatencyOptions(options);
      const wallet = await Wallet.create(peerEngines.a, messageService, {
        numberOfAttempts: 50,
        multiple: 1.5,
        initialDelay: 25,
      });

      peerEngines.b.on('objectiveStarted', async (o: WalletObjective) => {
        await peerEngines.b.joinChannels([o.data.targetChannelId]);
      });

      await expect(wallet.createChannels(getCreateChannelsArgs(), 50)).resolves.not.toThrow();
    }
  );

  //  This is a nice sanity check to ensure that messages do get dropped
  test('fails when all messages are dropped', async () => {
    messageService.setLatencyOptions({dropRate: 1});
    // We limit the attempts to avoid wasting times in the test
    const wallet = await Wallet.create(peerEngines.a, messageService, {
      numberOfAttempts: 1,
    });

    peerEngines.b.on('objectiveStarted', async (o: WalletObjective) => {
      const {targetChannelId: channelId} = o.data;
      await peerEngines.b.joinChannels([channelId]);
    });

    await expect(wallet.createChannels(getCreateChannelsArgs(), 1)).rejects.toThrow(
      'Unable to ensure objectives'
    );
  });
});
