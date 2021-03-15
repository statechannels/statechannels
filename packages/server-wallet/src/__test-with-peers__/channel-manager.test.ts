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
import {WalletObjective} from '../models/objective';
import {createChannelArgs} from '../wallet/__test__/fixtures/create-channel';

import {setupTestMessagingService} from './utils';

jest.setTimeout(60_000);

beforeAll(getPeersSetup());
afterAll(peersTeardown);

function getCreateChannelsArgs(): CreateChannelParams {
  return createChannelArgs({
    participants: [participantA, participantB],
    fundingStrategy: 'Fake',
  });
}

describe('EnsureObjectives', () => {
  const cases = [0, 0.1, 0.2, 0.3];

  test.each(cases)('creates a channel with a drop rate of %f ', async dropRate => {
    const participantWallets = [
      {participantId: participantIdA, wallet: peerWallets.a},
      {participantId: participantIdB, wallet: peerWallets.b},
    ];
    const messageService = await setupTestMessagingService(participantWallets, dropRate);
    const channelManager = new ChannelManager(peerWallets.a, messageService);

    peerWallets.b.on('objectiveStarted', async (o: WalletObjective) => {
      const {targetChannelId: channelId} = o.data;
      await peerWallets.b.joinChannel({channelId});
    });

    await channelManager.createChannels(getCreateChannelsArgs(), 5);
  });

  // This is a nice sanity check to ensure that messages do get dropped
  test('fails when all messages are dropped', async () => {
    const participantWallets = [
      {participantId: participantIdA, wallet: peerWallets.a},
      {participantId: participantIdB, wallet: peerWallets.b},
    ];
    const messageService = await setupTestMessagingService(participantWallets, 1);
    const channelManager = new ChannelManager(peerWallets.a, messageService);

    peerWallets.b.on('objectiveStarted', async (o: WalletObjective) => {
      const {targetChannelId: channelId} = o.data;
      await peerWallets.b.joinChannel({channelId});
    });

    await expect(channelManager.createChannels(getCreateChannelsArgs(), 5)).rejects.toThrow(
      'Unable to ensure objectives'
    );
  });
});
