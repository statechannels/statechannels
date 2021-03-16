import {CreateChannelParams} from '@statechannels/client-api-schema';

import {
  getPeersSetup,
  participantA,
  participantB,
  participantIdA,
  participantIdB,
  peersTeardown,
  peerWallets,
} from '../../jest/with-peers-setup-teardown';
import {ChannelManager} from '../channel-manager';
import {
  createTestMessageHandler,
  TestMessageService,
} from '../message-service/test-message-service';
import {WalletObjective} from '../models/objective';
import {createChannelArgs} from '../wallet/__test__/fixtures/create-channel';

jest.setTimeout(30_000);

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
  const cases = [0, 10, 30];

  test.each(cases)('creates a channel with a drop rate of %f%% ', async messageDropPercentage => {
    const participantWallets = [
      {participantId: participantIdA, wallet: peerWallets.a},
      {participantId: participantIdB, wallet: peerWallets.b},
    ];

    const dropRate = messageDropPercentage === 0 ? 0 : messageDropPercentage / 100;

    const messageService = await TestMessageService.create(
      createTestMessageHandler(participantWallets),
      peerWallets.a.logger,
      dropRate
    );
    const channelManager = await ChannelManager.create(peerWallets.a, messageService);

    peerWallets.b.on('objectiveStarted', async (o: WalletObjective) => {
      const {targetChannelId: channelId} = o.data;
      await peerWallets.b.joinChannel({channelId});
    });

    await channelManager.createChannels(getCreateChannelsArgs(), 50);
  });

  // This is a nice sanity check to ensure that messages do get dropped
  test('fails when all messages are dropped', async () => {
    const participantWallets = [
      {participantId: participantIdA, wallet: peerWallets.a},
      {participantId: participantIdB, wallet: peerWallets.b},
    ];

    const messageService = await TestMessageService.create(
      createTestMessageHandler(participantWallets),
      peerWallets.a.logger,
      1
    );
    // We use a short backoff to avoid burning times in the tests
    const channelManager = await ChannelManager.create(peerWallets.a, messageService, [1]);

    peerWallets.b.on('objectiveStarted', async (o: WalletObjective) => {
      const {targetChannelId: channelId} = o.data;
      await peerWallets.b.joinChannel({channelId});
    });

    await expect(channelManager.createChannels(getCreateChannelsArgs(), 1)).rejects.toThrow(
      'Unable to ensure objectives'
    );
  });
});
