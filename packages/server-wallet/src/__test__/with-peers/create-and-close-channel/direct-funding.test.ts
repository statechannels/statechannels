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
} from '../../../../jest/with-peers-setup-teardown';
import {WaitingFor} from '../../../protocols/channel-opener';
import {getChannelResultFor, getPayloadFor, ONE_DAY} from '../../test-helpers';

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

  //        A <> B
  // PreFund0
  const resultA0 = await peerWallets.a.createChannel(createChannelParams);

  channelId = resultA0.channelResults[0].channelId;

  expect(getChannelResultFor(channelId, resultA0.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  // Let's check what wallet a is waiting for. Expect it to be 'theirPreFundSetup' or ''
  // (if the objective has never been cranked)
  const waitingForBefore = (await peerWallets.a.getObjective(`OpenChannel-${channelId}`))
    .waitingFor;
  expect(waitingForBefore).toEqual(WaitingFor.theirPreFundSetup);

  //    > PreFund0A
  const resultB0 = await peerWallets.b.pushMessage(
    getPayloadFor(participantB.participantId, resultA0.outbox)
  );

  expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });

  //      PreFund0B
  const resultB1 = await peerWallets.b.joinChannel({channelId});
  expect(getChannelResultFor(channelId, [resultB1.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  //  PreFund0B <
  const resultA1 = await peerWallets.a.pushMessage(
    getPayloadFor(participantA.participantId, resultB1.outbox)
  );

  //  a was previously blocked on receiving b's prefund state. After pushing it in to a,
  //  a's OpenChannel objective should have made some progress (it is now waiting on something else)
  const waitingForAfter = (await peerWallets.a.getObjective(`OpenChannel-${channelId}`)).waitingFor;
  expect(waitingForAfter).not.toEqual(waitingForBefore);
  expect(waitingForAfter).toEqual(WaitingFor.funding);

  /**
   * In this case, there is no auto-advancing to the running stage. Instead we have
   * an intermediate 'opening' stage where each party must fund their channel. A funds
   * first, and then B funds. A and B both signs turnNum 3 on the call to updateFundingForChannels
   * and then sends the newly signed state to each other at the same time.
   */

  expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

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

  // < PostFund3B
  const resultA2 = await peerWallets.a.updateFundingForChannels([depositByB]);
  const resultB2 = await peerWallets.b.updateFundingForChannels([depositByB]);

  expect(getChannelResultFor(channelId, resultA2.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  expect(getChannelResultFor(channelId, resultB2.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  //  > PostFund3A
  const resultB3 = await peerWallets.b.pushMessage(
    getPayloadFor(participantB.participantId, resultA2.outbox)
  );
  expect(getChannelResultFor(channelId, resultB3.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });

  //  PostFund3B <
  const resultA3 = await peerWallets.a.pushMessage(
    getPayloadFor(participantA.participantId, resultB2.outbox)
  );
  expect(getChannelResultFor(channelId, resultA3.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });

  // -------------------------------
  // B closes when it isn't B's turn
  // -------------------------------

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
  // it shouldn't error if close channel is called twice
  await peerWallets.a.closeChannel(closeChannelParams);

  expect(getChannelResultFor(channelId, [aCloseChannelResult.channelResult])).toMatchObject({
    status: 'closing',
    turnNum: 4,
  });

  const bPushMessageResult = await peerWallets.b.pushMessage(
    getPayloadFor(participantB.participantId, aCloseChannelResult.outbox)
  );

  // B pushed isFinal4, generated countersigned isFinal4
  expect(getChannelResultFor(channelId, bPushMessageResult.channelResults)).toMatchObject({
    status: 'closed',
    turnNum: 4,
  });

  // A pushed the countersigned isFinal4
  const aPushMessageResult = await peerWallets.a.pushMessage(
    getPayloadFor(participantA.participantId, bPushMessageResult.outbox)
  );

  expect(getChannelResultFor(channelId, aPushMessageResult.channelResults)).toMatchObject({
    status: 'closed',
    turnNum: 4,
  });
});
