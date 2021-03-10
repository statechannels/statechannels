import {
  CreateChannelParams,
  Allocation,
  CloseChannelParams,
} from '@statechannels/client-api-schema';
import {makeAddress} from '@statechannels/wallet-core';
import {BigNumber, ethers} from 'ethers';

import {
  peerWallets,
  getPeersSetup,
  participantA,
  participantB,
  peersTeardown,
} from '../../../jest/with-peers-setup-teardown';
import {getChannelResultFor, ONE_DAY} from '../../__test__/test-helpers';
import {setupTestMessagingService} from '../../message-service/test-message-service';
const {AddressZero} = ethers.constants;
jest.setTimeout(10_000);

let channelId: string;

beforeAll(getPeersSetup());
afterAll(peersTeardown);

it('Create a directly funded channel between two wallets ', async () => {
  const allocation: Allocation = {
    allocationItems: [
      {
        destination: participantA.destination,
        amount: BigNumber.from(1).toHexString(),
      },
      {
        destination: participantB.destination,
        amount: BigNumber.from(1).toHexString(),
      },
    ],
    assetHolderAddress: makeAddress(AddressZero), // must be even length
  };

  const createChannelParams: CreateChannelParams = {
    participants: [participantA, participantB],
    allocations: [allocation],
    appDefinition: ethers.constants.AddressZero,
    appData: makeAddress(AddressZero), // must be even length
    fundingStrategy: 'Direct',
    challengeDuration: ONE_DAY,
  };
  const wallets = [
    {participantId: participantA.participantId, wallet: peerWallets.a},
    {participantId: participantB.participantId, wallet: peerWallets.b},
  ];
  const ms = await setupTestMessagingService(wallets);

  //        A <> B
  // PreFund0
  const resultA0 = await peerWallets.a.createChannel(createChannelParams);
  await ms.send(resultA0.outbox.map(o => o.params));
  channelId = resultA0.channelResults[0].channelId;

  //      PreFund0B
  const resultB1 = await peerWallets.b.joinChannel({channelId});
  await ms.send(resultB1.outbox.map(o => o.params));

  const depositByA = {
    channelId,
    assetHolderAddress: makeAddress(AddressZero),
    amount: BigNumber.from(1).toHexString(),
  }; // A sends 1 ETH (1 total)

  // This would have been triggered by A's Chain Service by request
  await peerWallets.a.updateFundingForChannels([depositByA]);
  await peerWallets.b.updateFundingForChannels([depositByA]);

  // Then, this would be triggered by B's Chain Service after observing A's deposit
  const depositByB = {
    channelId,
    assetHolderAddress: makeAddress(AddressZero),
    amount: BigNumber.from(2).toHexString(),
  }; // B sends 1 ETH (2 total)

  // Results before funding is complete
  let aLatestState = await peerWallets.a.getState({channelId});
  let bLatestState = await peerWallets.b.getState({channelId});
  expect(aLatestState.channelResult).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });
  expect(bLatestState.channelResult).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  const resultA2 = await peerWallets.a.updateFundingForChannels([depositByB]);
  const resultB2 = await peerWallets.b.updateFundingForChannels([depositByB]);
  await ms.send(resultA2.outbox.map(o => o.params));
  await ms.send(resultB2.outbox.map(o => o.params));

  aLatestState = await peerWallets.a.getState({channelId});
  bLatestState = await peerWallets.b.getState({channelId});
  expect(aLatestState.channelResult).toMatchObject({
    status: 'running',
    turnNum: 3,
  });
  expect(bLatestState.channelResult).toMatchObject({
    status: 'running',
    turnNum: 3,
  });

  const closeChannelParams: CloseChannelParams = {
    channelId,
  };

  const bCloseChannel = peerWallets.b.closeChannel(closeChannelParams);

  await bCloseChannel;

  // -------------------------------
  // A closes on A's turn
  // -------------------------------

  // A generates isFinal4
  const aCloseChannelResult = await peerWallets.a.closeChannel(closeChannelParams);
  await ms.send(aCloseChannelResult.outbox.map(o => o.params));
  // it shouldn't error if close channel is called twice
  await peerWallets.a.closeChannel(closeChannelParams);

  expect(getChannelResultFor(channelId, [aCloseChannelResult.channelResult])).toMatchObject({
    status: 'closing',
    turnNum: 4,
  });
  aLatestState = await peerWallets.a.getState({channelId});
  bLatestState = await peerWallets.b.getState({channelId});
  expect(aLatestState.channelResult).toMatchObject({
    status: 'closed',
    turnNum: 4,
  });

  // A pushed the countersigned isFinal4

  expect(bLatestState.channelResult).toMatchObject({
    status: 'closed',
    turnNum: 4,
  });
});
