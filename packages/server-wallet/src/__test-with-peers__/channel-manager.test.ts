import {Allocation, CreateChannelParams} from '@statechannels/client-api-schema';
import {makeAddress} from '@statechannels/wallet-core';
import {BigNumber, ethers, constants} from 'ethers';

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
import {ONE_DAY} from '../__test__/test-helpers';

import {setupTestMessagingService} from './utils';

jest.setTimeout(3000_000);

beforeAll(getPeersSetup());
afterAll(peersTeardown);

function getCreateChannelsArgs(): CreateChannelParams {
  const allocation: Allocation = {
    allocationItems: [
      {destination: participantA.destination, amount: BigNumber.from(1).toHexString()},
      {destination: participantB.destination, amount: BigNumber.from(1).toHexString()},
    ],
    assetHolderAddress: makeAddress(constants.AddressZero), // must be even length
  };

  return {
    participants: [participantA, participantB],
    allocations: [allocation],
    appDefinition: ethers.constants.AddressZero,
    appData: makeAddress(constants.AddressZero), // must be even length
    fundingStrategy: 'Fake',
    challengeDuration: ONE_DAY,
  };
}

describe('EnsureObjectives', () => {
  const cases = [0, 0.1, 0.2, 0.5];

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
