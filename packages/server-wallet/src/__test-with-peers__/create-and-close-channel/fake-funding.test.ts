import {
  CreateChannelParams,
  Allocation,
  CloseChannelParams,
} from '@statechannels/client-api-schema';
import {makeAddress} from '@statechannels/wallet-core';
import {BigNumber, ethers, constants} from 'ethers';

import {ONE_DAY} from '../../__test__/test-helpers';
import {
  peerEngines,
  getPeersSetup,
  participantA,
  participantB,
  peersTeardown,
  messageService,
} from '../../../jest/with-peers-setup-teardown';
import {expectLatestStateToMatch} from '../utils';
import {getMessages} from '../../message-service/utils';

let channelId: string;

beforeAll(getPeersSetup());
afterAll(peersTeardown);

it('Create a fake-funded channel between two engines ', async () => {
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
  const aCreateChannelOutput = await peerEngines.a.createChannel(channelParams);
  await messageService.send(getMessages(aCreateChannelOutput));
  channelId = aCreateChannelOutput.channelResult.channelId;

  expectLatestStateToMatch(channelId, peerEngines.a, {
    status: 'opening',
    turnNum: 0,
  });

  // A sends PreFund0 to B
  await expectLatestStateToMatch(channelId, peerEngines.b, {
    status: 'proposed',
    turnNum: 0,
  });

  // after joinChannel, B signs PreFund1 and PostFund3
  const bJoinChannelOutput = await peerEngines.b.joinChannel({channelId});
  await messageService.send(getMessages(bJoinChannelOutput));

  await expectLatestStateToMatch(channelId, peerEngines.a, {
    status: 'running',
    turnNum: 3,
  });

  await expectLatestStateToMatch(channelId, peerEngines.b, {
    status: 'running',
    turnNum: 3,
  });

  const closeChannelParams: CloseChannelParams = {
    channelId,
  };

  // A generates isFinal4
  const aCloseChannelResult = await peerEngines.a.closeChannel(closeChannelParams);
  await messageService.send(getMessages(aCloseChannelResult));

  await expectLatestStateToMatch(channelId, peerEngines.b, {
    status: 'closed',
    turnNum: 4,
  });

  await expectLatestStateToMatch(channelId, peerEngines.b, {
    status: 'closed',
    turnNum: 4,
  });
});
