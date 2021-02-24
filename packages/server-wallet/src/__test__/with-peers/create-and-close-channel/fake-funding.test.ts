import {
  CreateChannelParams,
  Allocation,
  CloseChannelParams,
} from '@statechannels/client-api-schema';
import {makeAddress} from '@statechannels/wallet-core';
import {BigNumber, ethers, constants} from 'ethers';

import {getChannelResultFor, getPayloadFor, ONE_DAY} from '../../test-helpers';
import {
  peerWallets,
  getPeersSetup,
  participantA,
  participantB,
  peersTeardown,
} from '../../../../jest/with-peers-setup-teardown';

let channelId: string;

beforeAll(getPeersSetup());
afterAll(peersTeardown);

it('Create a fake-funded channel between two wallets ', async () => {
  const assetHolderAddress = makeAddress(constants.AddressZero);
  const aBal = BigNumber.from(1).toHexString();

  const allocation: Allocation = {
    allocationItems: [{destination: participantA.destination, amount: aBal}],
    assetHolderAddress,
  };

  const channelParams: CreateChannelParams = {
    participants: [participantA, participantB],
    allocations: [allocation],
    appDefinition: ethers.constants.AddressZero,
    appData: '0x00', // must be even length
    fundingStrategy: 'Fake',
    challengeDuration: ONE_DAY,
  };

  //        A <> B
  // PreFund0
  const aCreateChannelOutput = await peerWallets.a.createChannel(channelParams);

  channelId = aCreateChannelOutput.channelResults[0].channelId;

  expect(getChannelResultFor(channelId, aCreateChannelOutput.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  // A sends PreFund0 to B
  const bProposeChannelPushOutput = await peerWallets.b.pushMessage(
    getPayloadFor(participantB.participantId, aCreateChannelOutput.outbox)
  );

  expect(getChannelResultFor(channelId, bProposeChannelPushOutput.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });

  // after joinChannel, B signs PreFund1 and PostFund3
  const bJoinChannelOutput = await peerWallets.b.joinChannel({channelId});

  expect(getChannelResultFor(channelId, [bJoinChannelOutput.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  // B sends signed PreFund1 and PostFund3 to A
  const aPushJoinChannelOutput = await peerWallets.a.pushMessage(
    getPayloadFor(participantA.participantId, bJoinChannelOutput.outbox)
  );
  expect(getChannelResultFor(channelId, aPushJoinChannelOutput.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });

  // A sends PostFund2 to B
  const bPushPostFundOutput = await peerWallets.b.pushMessage(
    getPayloadFor(participantB.participantId, aPushJoinChannelOutput.outbox)
  );
  expect(getChannelResultFor(channelId, bPushPostFundOutput.channelResults)).toMatchObject({
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
