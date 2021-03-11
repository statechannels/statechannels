import {
  Allocation,
  CloseChannelParams,
  CreateChannelParams,
} from '@statechannels/client-api-schema';
import {makeAddress} from '@statechannels/wallet-core';
import {BigNumber, constants, ethers} from 'ethers';

import {Wallet} from '../..';
import {
  getPeersSetup,
  participantA,
  participantB,
  peersTeardown,
  peerWallets,
} from '../../../jest/with-peers-setup-teardown';
import {getChannelResultFor, getPayloadFor, ONE_DAY} from '../../__test__/test-helpers';

async function crashAndRestart(wallet: Wallet): Promise<Wallet> {
  const config = wallet.walletConfig;
  await wallet.destroy();
  return Wallet.create(config); // Wallet that will "restart"
}
let channelId: string;
jest.setTimeout(10_000);

beforeAll(getPeersSetup());
afterAll(peersTeardown);

it('Create a directly-funded channel between two wallets, of which one crashes midway through ', async () => {
  const allocation: Allocation = {
    allocationItems: [
      {destination: participantA.destination, amount: BigNumber.from(1).toHexString()},
      {destination: participantB.destination, amount: BigNumber.from(1).toHexString()},
    ],
    assetHolderAddress: makeAddress(constants.AddressZero), // must be even length
  };

  const createChannelParams: CreateChannelParams = {
    participants: [participantA, participantB],
    allocations: [allocation],
    appDefinition: ethers.constants.AddressZero,
    appData: makeAddress(constants.AddressZero), // must be even length
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

  //    > PreFund0A
  const resultB0 = await peerWallets.b.pushMessage(
    getPayloadFor(participantB.participantId, resultA0.outbox)
  );

  expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });

  // Destory Wallet b and restart
  peerWallets.b = await crashAndRestart(peerWallets.b);

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
    assetHolderAddress: makeAddress(constants.AddressZero),
    amount: BigNumber.from(1).toHexString(),
  }; // A sends 1 ETH (1 total)

  // This would have been triggered by A's Chain Service by request
  await peerWallets.a.updateFundingForChannels([depositByA]);
  await peerWallets.b.updateFundingForChannels([depositByA]);

  // Then, this would be triggered by B's Chain Service after observing A's deposit
  const depositByB = {
    channelId,
    assetHolderAddress: makeAddress(constants.AddressZero),
    amount: BigNumber.from(2).toHexString(),
  }; // B sends 1 ETH (2 total)
  // < PostFund3B
  const resultA2 = await peerWallets.a.updateFundingForChannels([depositByB]);
  const resultB2 = await peerWallets.b.updateFundingForChannels([depositByB]);

  expect(getChannelResultFor(channelId, resultA2.channelResults)).toMatchObject({
    status: 'opening', // Still opening because turnNum 3 is not supported yet, but is signed by A
    turnNum: 0,
  });

  expect(getChannelResultFor(channelId, resultB2.channelResults)).toMatchObject({
    // Still opening because turnNum 3 is not supported yet (2 is not in the wallet)
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

  const closeChannelParams: CloseChannelParams = {
    channelId,
  };

  // A generates isFinal4
  const aCloseChannelResult = await peerWallets.a.closeChannel(closeChannelParams);

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
