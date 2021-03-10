import {
  CreateChannelParams,
  Allocation,
  CloseChannelParams,
} from '@statechannels/client-api-schema';
import {makeAddress} from '@statechannels/wallet-core';
import {BigNumber, ethers, constants} from 'ethers';

import {ONE_DAY} from '../../__test__/test-helpers';
import {
  peerWallets,
  getPeersSetup,
  participantA,
  participantB,
  peersTeardown,
} from '../../../jest/with-peers-setup-teardown';
import {setupTestMessagingService} from '../../message-service/test-message-service';
import {expectLatestStateToMatch} from '../utils';

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

  const wallets = [
    {participantId: participantA.participantId, wallet: peerWallets.a},
    {participantId: participantB.participantId, wallet: peerWallets.b},
  ];

  const ms = await setupTestMessagingService(wallets);

  //        A <> B
  // PreFund0
  const aCreateChannelOutput = await peerWallets.a.createChannel(channelParams);
  await ms.send(aCreateChannelOutput.outbox.map(o => o.params));
  channelId = aCreateChannelOutput.channelResults[0].channelId;

  expectLatestStateToMatch(channelId, peerWallets.a, {
    status: 'opening',
    turnNum: 0,
  });

  // A sends PreFund0 to B
  await expectLatestStateToMatch(channelId, peerWallets.b, {
    status: 'proposed',
    turnNum: 0,
  });

  // after joinChannel, B signs PreFund1 and PostFund3
  const bJoinChannelOutput = await peerWallets.b.joinChannel({channelId});
  await ms.send(bJoinChannelOutput.outbox.map(o => o.params));

  await expectLatestStateToMatch(channelId, peerWallets.a, {
    status: 'running',
    turnNum: 3,
  });

  await expectLatestStateToMatch(channelId, peerWallets.b, {
    status: 'running',
    turnNum: 3,
  });

  const closeChannelParams: CloseChannelParams = {
    channelId,
  };

  // A generates isFinal4
  const aCloseChannelResult = await peerWallets.a.closeChannel(closeChannelParams);
  await ms.send(aCloseChannelResult.outbox.map(o => o.params));

  await expectLatestStateToMatch(channelId, peerWallets.b, {
    status: 'closed',
    turnNum: 4,
  });

  await expectLatestStateToMatch(channelId, peerWallets.b, {
    status: 'closed',
    turnNum: 4,
  });
});
