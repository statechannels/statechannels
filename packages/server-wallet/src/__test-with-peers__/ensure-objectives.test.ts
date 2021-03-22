import {CreateChannelParams} from '@statechannels/client-api-schema';

import {
  getPeersSetup,
  messageService,
  participantA,
  participantB,
  peersTeardown,
  peerWallets,
} from '../../jest/with-peers-setup-teardown';
import {ChannelManager} from '../channel-manager';
import {LatencyOptions} from '../message-service/test-message-service';
import {WalletObjective} from '../models/objective';
import {createChannelArgs} from '../wallet/__test__/fixtures/create-channel';

jest.setTimeout(36_000);

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
    {dropRate: 0.2, meanDelay: undefined},
    // delay but no dropping
    {dropRate: 0, meanDelay: 150},
    // 10% message drop and 50 ms mean delay
    {dropRate: 0.1, meanDelay: 50},
  ];
  test.each(testCases)(
    'can successfully create a channel with the latency options: %o',
    async options => {
      messageService.setLatencyOptions(options);
      const channelManager = await ChannelManager.create(peerWallets.a, messageService);

      peerWallets.b.on('objectiveStarted', async (o: WalletObjective) => {
        await peerWallets.b.joinChannels([o.data.targetChannelId]);
      });

      await channelManager.createChannels(getCreateChannelsArgs(), 50);
    }
  );

  //  This is a nice sanity check to ensure that messages do get dropped
  test('fails when all messages are dropped', async () => {
    messageService.setLatencyOptions({dropRate: 1});
    // We use a short backoff to avoid burning times in the tests
    const channelManager = await ChannelManager.create(peerWallets.a, messageService, [1]);

    peerWallets.b.on('objectiveStarted', async (o: WalletObjective) => {
      const {targetChannelId: channelId} = o.data;
      await peerWallets.b.joinChannels([channelId]);
    });

    await expect(channelManager.createChannels(getCreateChannelsArgs(), 1)).rejects.toThrow(
      'Unable to ensure objectives'
    );
  });
});
