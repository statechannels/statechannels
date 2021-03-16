import {
  Allocation,
  CloseChannelParams,
  CreateChannelParams,
} from '@statechannels/client-api-schema';
import {makeAddress} from '@statechannels/wallet-core';
import {BigNumber, constants, ethers} from 'ethers';

import {
  crashAndRestart,
  getPeersSetup,
  messageService,
  participantA,
  participantB,
  peersTeardown,
  peerWallets,
} from '../../../jest/with-peers-setup-teardown';
import {getMessages} from '../../message-service/utils';
import {getChannelResultFor, getPayloadFor, ONE_DAY} from '../../__test__/test-helpers';
import {expectLatestStateToMatch} from '../utils';

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

  await expectLatestStateToMatch(channelId, peerWallets.a, {
    status: 'opening',
    turnNum: 0,
  });

  await messageService.send(getMessages(resultA0));

  await expectLatestStateToMatch(channelId, peerWallets.b, {
    status: 'proposed',
    turnNum: 0,
  });

  // Destroy Wallet b and restart
  await crashAndRestart('B');

  //      PreFund0B
  const resultB1 = await peerWallets.b.joinChannel({channelId});
  expect(getChannelResultFor(channelId, [resultB1.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  await messageService.send(getMessages(resultB1));

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

  await messageService.send(getMessages(resultA2));
  await messageService.send(getMessages(resultB2));

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
  await messageService.send(getMessages(resultB2));
  await expectLatestStateToMatch(channelId, peerWallets.a, {
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

  await messageService.send(getMessages(aCloseChannelResult));
  // B pushed isFinal4, generated countersigned isFinal4
  await expectLatestStateToMatch(channelId, peerWallets.a, {status: 'closed', turnNum: 4});
});
