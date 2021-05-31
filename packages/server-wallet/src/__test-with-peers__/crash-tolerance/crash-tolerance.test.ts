/* eslint-disable jest/no-commented-out-tests */
// TODO: This should be rewritten using wallets

// import {
//   Allocation,
//   CloseChannelParams,
//   CreateChannelParams,
// } from '@statechannels/client-api-schema';
// import {BN, makeAddress} from '@statechannels/wallet-core';
// import {BigNumber, constants, ethers} from 'ethers';

// import {
//   PeerSetup,
//   setupPeerEngines,
//   teardownPeerSetup,
//   crashAndRestart,
// } from '../../../jest/with-peers-setup-teardown';
// import {getMessages} from '../../message-service/utils';
// import {getChannelResultFor, getPayloadFor, ONE_DAY} from '../../__test__/test-helpers';
// import {expectLatestStateToMatch} from '../utils';

// let channelId: string;
// jest.setTimeout(10_000);

// let peerSetup: PeerSetup;
// beforeAll(async () => {
//   peerSetup = await setupPeerEngines();
// });
// afterAll(async () => {
//   await teardownPeerSetup(peerSetup);
// });

// it('Create a directly-funded channel between two engines, of which one crashes midway through ', async () => {
//   const allocation: Allocation = {
//     allocationItems: [
//       {destination: peerSetup.participantA.destination, amount: BigNumber.from(1).toHexString()},
//       {destination: peerSetup.participantB.destination, amount: BigNumber.from(1).toHexString()},
//     ],
//     assetHolderAddress: makeAddress(constants.AddressZero), // must be even length
//   };

//   const createChannelParams: CreateChannelParams = {
//     participants: [peerSetup.participantA, peerSetup.participantB],
//     allocations: [allocation],
//     appDefinition: ethers.constants.AddressZero,
//     appData: makeAddress(constants.AddressZero), // must be even length
//     fundingStrategy: 'Direct',
//     challengeDuration: ONE_DAY,
//   };

//   //        A <> B
//   // PreFund0
//   const resultA0 = await peerSetup.peerEngines.a.createChannel(createChannelParams);

//   channelId = resultA0.channelResult.channelId;

//   await expectLatestStateToMatch(channelId, peerSetup.peerEngines.a, {
//     status: 'opening',
//     turnNum: 0,
//   });

//   await peerSetup.messageService.send(getMessages(resultA0));

//   await expectLatestStateToMatch(channelId, peerSetup.peerEngines.b, {
//     status: 'proposed',
//     turnNum: 0,
//   });

//   // Destroy Engine b and restart
//   peerSetup = await crashAndRestart(peerSetup, 'B');

//   //      PreFund0B
//   const resultB1 = await peerSetup.peerEngines.b.joinChannel({channelId});
//   expect(resultB1.channelResult).toMatchObject({status: 'opening', turnNum: 0});

//   await peerSetup.messageService.send(getMessages(resultB1));

//   const assetHolderAddress = makeAddress(constants.AddressZero);
//   const depositByA = {channelId, assetHolderAddress, amount: BN.from(1)}; // A sends 1 ETH (1 total)

//   // This would have been triggered by A's Chain Service by request
//   await peerSetup.peerEngines.a.holdingUpdated(depositByA);
//   await peerSetup.peerEngines.b.holdingUpdated(depositByA);

//   // Then, this would be triggered by B's Chain Service after observing A's deposit
//   const depositByB = {channelId, assetHolderAddress, amount: BN.from(2)}; // B sends 1 ETH (2 total)
//   // < PostFund3B
//   const resultA2 = await peerSetup.peerEngines.a.holdingUpdated(depositByB);
//   const resultB2 = await peerSetup.peerEngines.b.holdingUpdated(depositByB);

//   // Still opening because turnNum 3 is not supported yet, but is signed by A
//   expect(resultA2.channelResult).toMatchObject({status: 'opening', turnNum: 0});

//   await peerSetup.messageService.send(getMessages(resultA2));
//   await peerSetup.messageService.send(getMessages(resultB2));

//   // Still opening because turnNum 3 is not supported yet (2 is not in the engine)
//   expect(resultB2.channelResult).toMatchObject({status: 'opening', turnNum: 0});

//   //  > PostFund3A
//   const resultB3 = await peerSetup.peerEngines.b.pushMessage(
//     getPayloadFor(peerSetup.participantB.participantId, resultA2.outbox)
//   );
//   expect(getChannelResultFor(channelId, resultB3.channelResults)).toMatchObject({
//     status: 'running',
//     turnNum: 3,
//   });

//   //  PostFund3B <
//   await peerSetup.messageService.send(getMessages(resultB2));
//   await expectLatestStateToMatch(channelId, peerSetup.peerEngines.a, {
//     status: 'running',
//     turnNum: 3,
//   });

//   const closeChannelParams: CloseChannelParams = {
//     channelId,
//   };

//   // A generates isFinal4
//   const aCloseChannelResult = await peerSetup.peerEngines.a.closeChannel(closeChannelParams);
//   expect(aCloseChannelResult.channelResult).toMatchObject({status: 'closing', turnNum: 4});

//   await peerSetup.messageService.send(getMessages(aCloseChannelResult));
//   // B pushed isFinal4, generated countersigned isFinal4
//   await expectLatestStateToMatch(channelId, peerSetup.peerEngines.a, {
//     status: 'closed',
//     turnNum: 4,
//   });
// });
