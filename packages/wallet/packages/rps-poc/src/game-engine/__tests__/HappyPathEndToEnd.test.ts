import GameEngine from '../GameEngine';
import ChannelWallet from '../ChannelWallet';
import Message from '../Message';
import * as ApplicationStatesA from '../application-states/PlayerA';
import * as ApplicationStatesB from '../application-states/PlayerB';
import { Play, Result } from '../pledges';
import * as Pledges from '../pledges';
import pledgeFromHex from '../pledges/decode';

const stake = 1;
const addressOfLibrary = 0xccc;
const initialBals = [5, 4];
const bWinsBals = [4, 5];
const aWinsBals = [6, 3];

it('runthrough', () => {
  const channelWalletA = new ChannelWallet(); // generates ephemeral keys
  const channelWalletB = new ChannelWallet(); // generates ephemeral keys

  const addressOfA = channelWalletA.address;
  const addressOfB = channelWalletB.address;

  const gameEngineA = new GameEngine(addressOfLibrary, channelWalletA);
  const gameEngineB = new GameEngine(addressOfLibrary, channelWalletB);

  // In A's application
  const readyToSendPreFundSetupA = gameEngineA.setupGame(
    addressOfA,
    addressOfB,
    stake,
    initialBals,
  );
  expect(readyToSendPreFundSetupA.type).toEqual(
    ApplicationStatesA.types.ReadyToSendPreFundSetupA,
  );
  const message0 = readyToSendPreFundSetupA.message;
  const gameState0 = pledgeFromHex(Message.fromHex(message0).state) as Pledges.PreFundSetup;
  expect(gameState0.turnNum).toEqual(0);
  expect(gameState0.stateCount).toEqual(0);
  expect(gameState0.resolution).toEqual(initialBals);
  expect(gameState0.stake).toEqual(1);

  const waitForPreFundSetupB = gameEngineA.messageSent({ oldState: readyToSendPreFundSetupA });
  expect(waitForPreFundSetupB.type).toEqual(ApplicationStatesA.types.WaitForPreFundSetupB);
  expect(waitForPreFundSetupB.message).toEqual(message0);

  // In B's application
  const readyToSendPreFundSetupB = gameEngineB.prefundProposalReceived({ hexMessage: message0 });
  expect(readyToSendPreFundSetupB.type).toEqual(
    ApplicationStatesB.types.ReadyToSendPreFundSetupB,
  );
  expect(readyToSendPreFundSetupB.balances).toEqual(initialBals);
  expect(readyToSendPreFundSetupB.channel).toEqual(waitForPreFundSetupB.channel);
  expect(readyToSendPreFundSetupB.stake).toEqual(stake);

  const message1 = readyToSendPreFundSetupB.message as Message;
  const gameState1 = pledgeFromHex(message1.state) as Pledges.PreFundSetup;
  expect(gameState1.turnNum).toEqual(1);
  expect(gameState1.stateCount).toEqual(1);
  expect(gameState1.resolution).toEqual(initialBals);
  expect(gameState1.stake).toEqual(1);

  const waitForDeployAdjudicatorB = gameEngineB.messageSent({ oldState: readyToSendPreFundSetupB });
  expect(waitForDeployAdjudicatorB.type).toEqual(ApplicationStatesB.types.WaitForAToDeploy);
  expect(waitForDeployAdjudicatorB.balances).toEqual(initialBals);

  // In A's application
  const readyToDeployAdjudicator = gameEngineA.receiveMessage({
    message: message1,
    oldState: waitForPreFundSetupB,
  });
  expect(readyToDeployAdjudicator.type).toEqual(ApplicationStatesA.types.ReadyToDeploy);
  expect(readyToDeployAdjudicator.transaction).not.toBeUndefined();

  const waitForDeployAdjudicatorA = gameEngineA.transactionSent({
    oldState: readyToDeployAdjudicator,
  });
  expect(waitForDeployAdjudicatorA.type).toEqual(
    ApplicationStatesA.types.WaitForBlockchainDeploy,
  );

  // From the blockchain

  const adjudicator = '0x2718';
  const deploymentEvent = { adjudicator, funds: 1 }; // TODO

  // In A's application
  const waitForFundingA = gameEngineA.receiveEvent({
    event: deploymentEvent,
    oldState: waitForDeployAdjudicatorA,
  });
  expect(waitForFundingA.type).toEqual(ApplicationStatesA.types.WaitForBToDeposit);
  expect(waitForFundingA.adjudicator).toEqual(adjudicator);

  // In B's application
  const readyToFund = gameEngineB.receiveEvent({
    event: deploymentEvent,
    oldState: waitForDeployAdjudicatorB,
  });
  expect(readyToFund.type).toEqual(ApplicationStatesB.types.ReadyToDeposit);
  expect(readyToFund.adjudicator).toEqual(adjudicator);
  expect(readyToFund.transaction).not.toBeUndefined();
  expect(readyToFund.balances).toEqual(initialBals);

  const waitForFundingB = gameEngineB.transactionSent({ oldState: readyToFund });
  expect(waitForFundingB.type).toEqual(ApplicationStatesB.types.WaitForPostFundSetupA);
  expect(waitForFundingB.adjudicator).toEqual(adjudicator);
  expect(waitForFundingB.balances).toEqual(initialBals);

  // From the blockchain
  const fundingEvent = { adjudicator: adjudicator, aBalance: 1, bBalance: 2 }; // TODO

  // In A's application
  const readyToSendPostFundSetupA = gameEngineA.receiveEvent({
    event: fundingEvent,
    oldState: waitForFundingA,
  });
  expect(readyToSendPostFundSetupA.type).toEqual(
    ApplicationStatesA.types.ReadyToSendPostFundSetupA,
  );

  const message2 = readyToSendPostFundSetupA.message;
  expect(message2).not.toBeUndefined();
  const gameState2 = pledgeFromHex(message2.state) as Pledges.PostFundSetup;
  expect(gameState2.turnNum).toEqual(2);
  expect(gameState2.stateCount).toEqual(0);
  expect(gameState2.resolution).toEqual(initialBals);
  expect(gameState2.stake).toEqual(1);

  const waitForPostFundSetupB = gameEngineA.messageSent({ oldState: readyToSendPostFundSetupA });
  expect(waitForPostFundSetupB.type).toEqual(ApplicationStatesA.types.WaitForPostFundSetupB);
  expect(waitForPostFundSetupB.adjudicator).toEqual(adjudicator);

  // In B's application
  const readyToSendPostFundSetupB = gameEngineB.receiveMessage({
    message: message2,
    oldState: waitForFundingB,
  });
  expect(readyToSendPostFundSetupB.type).toEqual(
    ApplicationStatesB.types.ReadyToSendPostFundSetupB,
  );
  expect(readyToSendPostFundSetupB.balances).not.toBeUndefined();
  const message3 = readyToSendPostFundSetupB.message;
  expect(message3).not.toBeUndefined();
  expect(readyToSendPostFundSetupB.balances).toEqual(initialBals);

  const gameState3 = pledgeFromHex(message3.state) as Pledges.PostFundSetup;
  expect(gameState3.turnNum).toEqual(3);
  expect(gameState3.stateCount).toEqual(1);
  expect(gameState3.resolution).toEqual(initialBals);
  expect(gameState3.stake).toEqual(1);

  const waitForPropose = gameEngineB.messageSent({ oldState: readyToSendPostFundSetupB });
  expect(waitForPropose.type).toEqual(ApplicationStatesB.types.WaitForPropose);

  // In A's application
  const readyToChooseAPlay = gameEngineA.receiveMessage({
    message: message3,
    oldState: waitForPostFundSetupB,
  });
  expect(readyToChooseAPlay.type).toEqual(ApplicationStatesA.types.ReadyToChooseAPlay);

  const readyToSendPropose = gameEngineA.choosePlay(readyToChooseAPlay, Play.Rock);
  expect(readyToSendPropose.type).toEqual(ApplicationStatesA.types.ReadyToSendPropose);
  expect(readyToSendPropose.aPlay).toEqual(Play.Rock);
  expect(readyToSendPropose.message).not.toBeUndefined();
  expect(readyToSendPropose.salt).not.toBeUndefined();

  const gameState4 = pledgeFromHex(readyToSendPropose.message.state) as Pledges.Propose;
  expect(gameState4.turnNum).toEqual(4);
  expect(gameState4.stake).toEqual(1);
  expect(gameState4.resolution).toEqual(bWinsBals);

  const waitForAccept = gameEngineA.messageSent({
    oldState: readyToSendPropose,
  });
  expect(waitForAccept.type).toEqual(ApplicationStatesA.types.WaitForAccept);
  const proposal = waitForAccept.message;
  expect(proposal).not.toBeUndefined();
  expect(waitForAccept.salt).toEqual(readyToSendPropose.salt);

  // In B's application
  const readyToChooseBPlay = gameEngineB.receiveMessage({
    message: proposal,
    oldState: waitForPropose,
  });
  expect(readyToChooseBPlay.type).toEqual(ApplicationStatesB.types.ReadyToChooseBPlay);
  expect(readyToChooseBPlay.opponentMessage).not.toBeUndefined();

  const readyToSendAccept = gameEngineB.choosePlay(readyToChooseBPlay, Play.Scissors);
  expect(readyToSendAccept.type).toEqual(ApplicationStatesB.types.ReadyToSendAccept);
  const message5 = readyToSendAccept.message;
  const gameState5 = pledgeFromHex(message5.state) as Pledges.Accept;
  expect(gameState5.turnNum).toEqual(5);
  expect(gameState5.stake).toEqual(1);
  expect(gameState5.resolution).toEqual(bWinsBals);

  const waitForReveal = gameEngineB.messageSent({ oldState: readyToSendAccept });
  expect(waitForReveal.type).toEqual(ApplicationStatesB.types.WaitForReveal);
  expect(waitForReveal.bPlay).toEqual(Play.Scissors);
  expect(waitForReveal.message).not.toBeUndefined();

  // In A's application
  const readyToSendReveal = gameEngineA.receiveMessage({
    message: message5,
    oldState: waitForAccept,
  });
  expect(readyToSendReveal.type).toEqual(ApplicationStatesA.types.ReadyToSendReveal);
  expect(readyToSendReveal.aPlay).toEqual(Play.Rock);
  expect(readyToSendReveal.bPlay).toEqual(Play.Scissors);
  expect(readyToSendReveal.salt).toEqual(waitForAccept.salt);
  expect(readyToSendReveal.result).toEqual(Result.AWon);

  const message6 = readyToSendReveal.message;
const gameState6 = pledgeFromHex(message6.state) as Pledges.Reveal;
  expect(gameState6.turnNum).toEqual(6);
  expect(gameState6.stake).toEqual(1);
  expect(gameState6.aPlay).toEqual(Play.Rock);
  expect(gameState6.bPlay).toEqual(Play.Scissors);
  expect(gameState6.resolution).toEqual(aWinsBals);

  // In B's application
  const readyToSendResting = gameEngineB.receiveMessage({
    message: message6,
    oldState: waitForReveal,
  });
  expect(readyToSendResting.type).toEqual(ApplicationStatesB.types.ReadyToSendResting);
  expect(readyToSendResting.balances).toEqual([6, 3]);
  const message7 = readyToSendResting.message;
  const gameState7 = pledgeFromHex(message7.state);
  expect(gameState7.turnNum).toEqual(7);
  expect(gameState7.resolution).toEqual(aWinsBals);

  // In A's application
  const readyToChoosePlay2 = gameEngineA.receiveMessage({
    message: message7,
    oldState: readyToSendReveal,
  });
  expect(readyToChoosePlay2.type).toEqual(ApplicationStatesA.types.ReadyToChooseAPlay);

  const readyToSendPropose2 = gameEngineA.choosePlay(readyToChoosePlay2, Play.Paper);
  expect(readyToSendPropose2.type).toEqual(ApplicationStatesA.types.ReadyToSendPropose);
  expect(readyToSendPropose2.aPlay).toEqual(Play.Paper);
  expect(readyToSendPropose2.message).not.toBeUndefined();
  expect(readyToSendPropose2.salt).not.toBeUndefined();

  const gameState8_0 = pledgeFromHex(readyToSendPropose2.message.state);
  expect(gameState8_0.turnNum).toEqual(8);

  // In B's application
  const readyToSendConclude = gameEngineB.conclude({
    oldState: readyToSendResting,
  });

  expect(readyToSendConclude instanceof ApplicationStatesB.ReadyToSendConcludeB).toBe(true);
  expect(readyToSendConclude.message).not.toBeUndefined();
  const gameState8_1 = pledgeFromHex(readyToSendConclude.message.state);

  expect(gameState8_1.resolution).toEqual(aWinsBals);
  expect(gameState8_1.turnNum).toEqual(8);
  expect(gameState8_1.stateType).toEqual(3);
});
