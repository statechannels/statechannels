import GameEngine from '../GameEngine';
import ChannelWallet from '../ChannelWallet';
import Message from '../Message';
import * as ApplicationStatesA from '../application-states/ApplicationStatesPlayerA';
import * as ApplicationStatesB from '../application-states/ApplicationStatesPlayerB';
import { Play, Result } from '../pledges';
import pledgeFromHex from '../pledges/decode';

let Eth = require('web3-eth');
let eth = new Eth('http://localhost:8545');

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
  const readyToSendPreFundSetup0 = gameEngineA.setupGame(
    addressOfA,
    addressOfB,
    stake,
    initialBals,
  );
  expect(readyToSendPreFundSetup0.type).toEqual(
    ApplicationStatesA.types.ReadyToSendPreFundSetup0,
  );
  const message0 = readyToSendPreFundSetup0.message;
  const gameState0 = pledgeFromHex(Message.fromHex(message0).state);
  expect(gameState0.turnNum).toEqual(0);
  expect(gameState0.stateCount).toEqual(0);
  expect(gameState0.resolution).toEqual(initialBals);
  expect(gameState0.stake).toEqual(1);

  const waitForPreFundSetup1 = gameEngineA.messageSent({ oldState: readyToSendPreFundSetup0 });
  expect(waitForPreFundSetup1.type).toEqual(ApplicationStatesA.types.WaitForPreFundSetup1);
  expect(waitForPreFundSetup1.message).toEqual(message0);

  // In B's application
  const readyToSendPreFundSetup1 = gameEngineB.prefundProposalReceived({ hexMessage: message0 });
  expect(readyToSendPreFundSetup1.type).toEqual(
    ApplicationStatesB.types.ReadyToSendPreFundSetup1,
  );
  expect(readyToSendPreFundSetup1._balances).toEqual(initialBals);
  expect(readyToSendPreFundSetup1._channel).toEqual(waitForPreFundSetup1._channel);
  expect(readyToSendPreFundSetup1.stake).toEqual(stake);

  const message1 = readyToSendPreFundSetup1.message;
  const gameState1 = pledgeFromHex(message1.state);
  expect(gameState1.turnNum).toEqual(1);
  expect(gameState1.stateCount).toEqual(1);
  expect(gameState1.resolution).toEqual(initialBals);
  expect(gameState1.stake).toEqual(1);

  const waitForDeployAdjudicatorB = gameEngineB.messageSent({ oldState: readyToSendPreFundSetup1 });
  expect(waitForDeployAdjudicatorB.type).toEqual(ApplicationStatesB.types.WaitForAToDeploy);
  expect(waitForDeployAdjudicatorB._balances).toEqual(initialBals);

  // In A's application
  const readyToDeployAdjudicator = gameEngineA.receiveMessage({
    message: message1,
    oldState: waitForPreFundSetup1,
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
  const waitForFunding0 = gameEngineA.receiveEvent({
    event: deploymentEvent,
    oldState: waitForDeployAdjudicatorA,
  });
  expect(waitForFunding0.type).toEqual(ApplicationStatesA.types.WaitForBToDeposit);
  expect(waitForFunding0.adjudicator).toEqual(adjudicator);

  // In B's application
  const readyToFund = gameEngineB.receiveEvent({
    event: deploymentEvent,
    oldState: waitForDeployAdjudicatorB,
  });
  expect(readyToFund.type).toEqual(ApplicationStatesB.types.ReadyToDeposit);
  expect(readyToFund.adjudicator).toEqual(adjudicator);
  expect(readyToFund.transaction).not.toBeUndefined();
  expect(readyToFund._balances).toEqual(initialBals);

  const waitForFunding1 = gameEngineB.transactionSent({ oldState: readyToFund });
  expect(waitForFunding1.type).toEqual(ApplicationStatesB.types.WaitForPostFundSetup0);
  expect(waitForFunding1.adjudicator).toEqual(adjudicator);
  expect(waitForFunding1._balances).toEqual(initialBals);

  // From the blockchain
  const fundingEvent = { adjudicator: adjudicator, aBalance: 1, bBalance: 2 }; // TODO

  // In A's application
  const readyToSendPostFundSetup0 = gameEngineA.receiveEvent({
    event: fundingEvent,
    oldState: waitForFunding0,
  });
  expect(readyToSendPostFundSetup0.type).toEqual(
    ApplicationStatesA.types.ReadyToSendPostFundSetup0,
  );

  const message2 = readyToSendPostFundSetup0.message;
  expect(message2).not.toBeUndefined();
  const gameState2 = pledgeFromHex(message2.state);
  expect(gameState2.turnNum).toEqual(2);
  expect(gameState2.stateCount).toEqual(0);
  expect(gameState2.resolution).toEqual(initialBals);
  expect(gameState2.stake).toEqual(1);

  const waitForPostFundSetup1 = gameEngineA.messageSent({ oldState: readyToSendPostFundSetup0 });
  expect(waitForPostFundSetup1.type).toEqual(ApplicationStatesA.types.WaitForPostFundSetup1);
  expect(waitForPostFundSetup1.adjudicator).toEqual(adjudicator);

  // In B's application
  const readyToSendPostFundSetup1 = gameEngineB.receiveMessage({
    message: message2,
    oldState: waitForFunding1,
  });
  expect(readyToSendPostFundSetup1.type).toEqual(
    ApplicationStatesB.types.ReadyToSendPostFundSetup1,
  );
  expect(readyToSendPostFundSetup1._balances).not.toBeUndefined();
  const message3 = readyToSendPostFundSetup1.message;
  expect(message3).not.toBeUndefined();
  expect(readyToSendPostFundSetup1._balances).toEqual(initialBals);

  const gameState3 = pledgeFromHex(message3.state);
  expect(gameState3.turnNum).toEqual(3);
  expect(gameState3.stateCount).toEqual(1);
  expect(gameState3.resolution).toEqual(initialBals);
  expect(gameState3.stake).toEqual(1);

  const waitForPropose = gameEngineB.messageSent({ oldState: readyToSendPostFundSetup1 });
  expect(waitForPropose.type).toEqual(ApplicationStatesB.types.WaitForPropose);

  // In A's application
  const readyToChoosePlay0 = gameEngineA.receiveMessage({
    message: message3,
    oldState: waitForPostFundSetup1,
  });
  expect(readyToChoosePlay0.type).toEqual(ApplicationStatesA.types.ReadyToChooseAPlay);

  const readyToSendPropose = gameEngineA.choosePlay(readyToChoosePlay0, Play.Rock);
  expect(readyToSendPropose.type).toEqual(ApplicationStatesA.types.ReadyToSendPropose);
  expect(readyToSendPropose.aPlay).toEqual(Play.Rock);
  expect(readyToSendPropose.message).not.toBeUndefined();
  expect(readyToSendPropose.salt).not.toBeUndefined();

  const gameState4 = pledgeFromHex(readyToSendPropose.message.state);
  expect(gameState4.turnNum).toEqual(4);
  expect(gameState4.stake).toEqual(1);
  expect(gameState4.resolution).toEqual(bWinsBals);

  const waitForAccept = gameEngineA.messageSent({
    message: readyToSendPropose.message,
    oldState: readyToSendPropose,
  });
  expect(waitForAccept.type).toEqual(ApplicationStatesA.types.WaitForAccept);
  const proposal = waitForAccept.message;
  expect(proposal).not.toBeUndefined();
  expect(waitForAccept.salt).toEqual(readyToSendPropose.salt);

  // In B's application
  const readyToChoosePlay1 = gameEngineB.receiveMessage({
    message: proposal,
    oldState: waitForPropose,
  });
  expect(readyToChoosePlay1.type).toEqual(ApplicationStatesB.types.ReadyToChooseBPlay);
  expect(readyToChoosePlay1.opponentMessage).not.toBeUndefined();

  const readyToSendAccept = gameEngineB.choosePlay(readyToChoosePlay1, Play.Scissors);
  expect(readyToSendAccept.type).toEqual(ApplicationStatesB.types.ReadyToSendAccept);
  const message5 = readyToSendAccept.message;
  const gameState5 = pledgeFromHex(message5.state);
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
  const gameState6 = pledgeFromHex(message6.state);
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
  expect(readyToSendResting._balances).toEqual([6, 3]);
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

  const gameState8 = pledgeFromHex(readyToSendPropose2.message.state);
  expect(gameState8.turnNum).toEqual(8);

  // In B's application
  const readyToSendConclude = gameEngineB.conclude({
    oldState: readyToSendResting,
  });

  expect(readyToSendConclude.type).toEqual(ApplicationStatesB.readyToSendConclude);
  expect(readyToSendConclude.message).not.toBeUndefined();
});
