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
  messageService,
} from '../../../jest/with-peers-setup-teardown';
import {getChannelResultFor, ONE_DAY} from '../../__test__/test-helpers';
import {expectLatestStateToMatch, getMessages} from '../utils';

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
  await messageService.send(getMessages(resultA0));
  channelId = resultA0.channelResults[0].channelId;

  //      PreFund0B
  const resultB1 = await peerWallets.b.joinChannel({channelId});
  await messageService.send(getMessages(resultB1));

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
  await expectLatestStateToMatch(channelId, peerWallets.a, {
    status: 'opening',
    turnNum: 0,
  });
  await expectLatestStateToMatch(channelId, peerWallets.b, {
    status: 'opening',
    turnNum: 0,
  });

  const resultA2 = await peerWallets.a.updateFundingForChannels([depositByB]);
  const resultB2 = await peerWallets.b.updateFundingForChannels([depositByB]);
  await messageService.send(getMessages(resultA2));
  await messageService.send(getMessages(resultB2));

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

  const bCloseChannel = peerWallets.b.closeChannel(closeChannelParams);

  await bCloseChannel;

  // -------------------------------
  // A closes on A's turn
  // -------------------------------

  // A generates isFinal4
  const aCloseChannelResult = await peerWallets.a.closeChannel(closeChannelParams);
  await messageService.send(getMessages(aCloseChannelResult));
  // it shouldn't error if close channel is called twice
  await peerWallets.a.closeChannel(closeChannelParams);

  expect(getChannelResultFor(channelId, [aCloseChannelResult.channelResult])).toMatchObject({
    status: 'closing',
    turnNum: 4,
  });
  await expectLatestStateToMatch(channelId, peerWallets.a, {
    status: 'closed',
    turnNum: 4,
  });
  // A pushed the countersigned isFinal4
  await expectLatestStateToMatch(channelId, peerWallets.b, {
    status: 'closed',
    turnNum: 4,
  });
});
