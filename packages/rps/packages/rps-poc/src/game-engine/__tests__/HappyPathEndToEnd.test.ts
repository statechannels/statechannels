import * as GameEngine from '../GameEngine';
import ChannelWallet from '../ChannelWallet';
import Message from '../Message';
import * as ApplicationStatesA from '../application-states/PlayerA';
import * as ApplicationStatesB from '../application-states/PlayerB';
import { Play, Result } from '../positions';
import * as positions from '../positions';
import pledgeFromHex from '../positions/decode';

const stake = 1;
const initialBals = [5, 4];
const bWinsBals = [4, 5];
const aWinsBals = [6, 3];

it('runthrough', () => {
  const channelWalletA = new ChannelWallet(); // generates ephemeral keys
  const channelWalletB = new ChannelWallet(); // generates ephemeral keys

  // In A's application
  const gameEngineA = GameEngine.setupGame({
    opponent: channelWalletB.address,
    stake,
    balances: initialBals,
    wallet: channelWalletA,
  });
  const readyToSendPreFundSetupA = gameEngineA.state;
  expect(readyToSendPreFundSetupA).toBeInstanceOf(ApplicationStatesA.ReadyToSendPreFundSetupA);
  const message0 = readyToSendPreFundSetupA.message;
  const gameState0 = pledgeFromHex(message0.state) as positions.PreFundSetup;
  expect(gameState0.turnNum).toEqual(0);
  expect(gameState0.stateCount).toEqual(0);
  expect(gameState0.resolution).toEqual(initialBals);
  expect(gameState0.stake).toEqual(1);

  const waitForPreFundSetupB = gameEngineA.messageSent();
  expect(waitForPreFundSetupB).toBeInstanceOf(ApplicationStatesA.WaitForPreFundSetupB);
  expect(waitForPreFundSetupB.message).toEqual(message0);

  // In B's application
  const gameEngineB = GameEngine.fromProposal({ message: message0, wallet: channelWalletB });
  const readyToSendPreFundSetupB = gameEngineB.state;
  expect(readyToSendPreFundSetupB).toBeInstanceOf(ApplicationStatesB.ReadyToSendPreFundSetupB);
  expect(readyToSendPreFundSetupB.balances).toEqual(initialBals);
  expect(readyToSendPreFundSetupB.channel).toEqual(waitForPreFundSetupB.channel);
  expect(readyToSendPreFundSetupB.stake).toEqual(stake);

  const message1 = readyToSendPreFundSetupB.message as Message;
  const gameState1 = pledgeFromHex(message1.state) as positions.PreFundSetup;
  expect(gameState1.turnNum).toEqual(1);
  expect(gameState1.stateCount).toEqual(1);
  expect(gameState1.resolution).toEqual(initialBals);
  expect(gameState1.stake).toEqual(1);

  const waitForDeployAdjudicatorB = gameEngineB.messageSent();
  expect(waitForDeployAdjudicatorB).toBeInstanceOf(ApplicationStatesB.WaitForAToDeploy);
  expect(waitForDeployAdjudicatorB.balances).toEqual(initialBals);

  // In A's application //  should be in WaitForPreFundSetupB
  const readyToDeployAdjudicator = gameEngineA.receiveMessage(message1);
  expect(readyToDeployAdjudicator).toBeInstanceOf(ApplicationStatesA.ReadyToDeploy);
  expect(readyToDeployAdjudicator.transaction).not.toBeUndefined();

  const waitForDeployAdjudicatorA = gameEngineA.transactionSent();
  expect(waitForDeployAdjudicatorA).toBeInstanceOf(ApplicationStatesA.WaitForBlockchainDeploy);

  // From the blockchain

  const adjudicator = '0x2718';
  const deploymentEvent = { adjudicator, funds: 1 }; // TODO

  // In A's application
  const waitForFundingA = gameEngineA.receiveEvent(deploymentEvent);
  expect(waitForFundingA).toBeInstanceOf(ApplicationStatesA.WaitForBToDeposit);
  expect(waitForFundingA.adjudicator).toEqual(adjudicator);

  // In B's application
  const readyToFund = gameEngineB.receiveEvent(deploymentEvent);
  expect(readyToFund).toBeInstanceOf(ApplicationStatesB.ReadyToDeposit);
  expect(readyToFund.adjudicator).toEqual(adjudicator);
  expect(readyToFund.transaction).not.toBeUndefined();
  expect(readyToFund.balances).toEqual(initialBals);

  const waitForFundingB = gameEngineB.transactionSent();
  expect(waitForFundingB).toBeInstanceOf(ApplicationStatesB.WaitForPostFundSetupA);
  expect(waitForFundingB.adjudicator).toEqual(adjudicator);
  expect(waitForFundingB.balances).toEqual(initialBals);

  // From the blockchain
  const fundingEvent = { adjudicator, aBalance: 1, bBalance: 2 }; // TODO

  // In A's application
  const readyToSendPostFundSetupA = gameEngineA.receiveEvent(fundingEvent);
  expect(readyToSendPostFundSetupA).toBeInstanceOf(ApplicationStatesA.ReadyToSendPostFundSetupA);

  const message2 = readyToSendPostFundSetupA.message;
  expect(message2).not.toBeUndefined();
  const gameState2 = pledgeFromHex(message2.state) as positions.PostFundSetup;
  expect(gameState2.turnNum).toEqual(2);
  expect(gameState2.stateCount).toEqual(0);
  expect(gameState2.resolution).toEqual(initialBals);
  expect(gameState2.stake).toEqual(1);

  const waitForPostFundSetupB = gameEngineA.messageSent();
  expect(waitForPostFundSetupB).toBeInstanceOf(ApplicationStatesA.WaitForPostFundSetupB);
  expect(waitForPostFundSetupB.adjudicator).toEqual(adjudicator);

  // In B's application
  const readyToSendPostFundSetupB = gameEngineB.receiveMessage(message2);
  expect(readyToSendPostFundSetupB).toBeInstanceOf(ApplicationStatesB.ReadyToSendPostFundSetupB);
  expect(readyToSendPostFundSetupB.balances).not.toBeUndefined();
  const message3 = readyToSendPostFundSetupB.message;
  expect(message3).not.toBeUndefined();
  expect(readyToSendPostFundSetupB.balances).toEqual(initialBals);

  const gameState3 = pledgeFromHex(message3.state) as positions.PostFundSetup;
  expect(gameState3.turnNum).toEqual(3);
  expect(gameState3.stateCount).toEqual(1);
  expect(gameState3.resolution).toEqual(initialBals);
  expect(gameState3.stake).toEqual(1);

  const waitForPropose = gameEngineB.messageSent();
  expect(waitForPropose).toBeInstanceOf(ApplicationStatesB.WaitForPropose);

  // In A's application
  const readyToChooseAPlay = gameEngineA.receiveMessage(message3);
  expect(readyToChooseAPlay).toBeInstanceOf(ApplicationStatesA.ReadyToChooseAPlay);

  const readyToSendPropose = gameEngineA.choosePlay(Play.Rock);
  expect(readyToSendPropose).toBeInstanceOf(ApplicationStatesA.ReadyToSendPropose);
  expect(readyToSendPropose.aPlay).toEqual(Play.Rock);
  expect(readyToSendPropose.message).not.toBeUndefined();
  expect(readyToSendPropose.salt).not.toBeUndefined();

  const gameState4 = pledgeFromHex(readyToSendPropose.message.state) as positions.Propose;
  expect(gameState4.turnNum).toEqual(4);
  expect(gameState4.stake).toEqual(1);
  expect(gameState4.resolution).toEqual(initialBals);

  const waitForAccept = gameEngineA.messageSent();
  expect(waitForAccept).toBeInstanceOf(ApplicationStatesA.WaitForAccept);
  const proposal = waitForAccept.message;
  expect(proposal).not.toBeUndefined();
  expect(waitForAccept.salt).toEqual(readyToSendPropose.salt);

  // In B's application
  const readyToChooseBPlay = gameEngineB.receiveMessage(proposal);
  expect(readyToChooseBPlay).toBeInstanceOf(ApplicationStatesB.ReadyToChooseBPlay);

  const readyToSendAccept = gameEngineB.choosePlay(Play.Scissors);
  expect(readyToSendAccept).toBeInstanceOf(ApplicationStatesB.ReadyToSendAccept);
  const message5 = readyToSendAccept.message;
  const gameState5 = pledgeFromHex(message5.state) as positions.Accept;
  expect(gameState5.turnNum).toEqual(5);
  expect(gameState5.stake).toEqual(1);
  expect(gameState5.resolution).toEqual(bWinsBals);

  const waitForReveal = gameEngineB.messageSent();
  expect(waitForReveal).toBeInstanceOf(ApplicationStatesB.WaitForReveal);
  expect(waitForReveal.bPlay).toEqual(Play.Scissors);
  expect(waitForReveal.message).not.toBeUndefined();

  // In A's application
  const readyToSendReveal = gameEngineA.receiveMessage(message5);
  expect(readyToSendReveal).toBeInstanceOf(ApplicationStatesA.ReadyToSendReveal);
  expect(readyToSendReveal.aPlay).toEqual(Play.Rock);
  expect(readyToSendReveal.bPlay).toEqual(Play.Scissors);
  expect(readyToSendReveal.salt).toEqual(waitForAccept.salt);
  expect(readyToSendReveal.result).toEqual(Result.AWon);

  const message6 = readyToSendReveal.message;
  const gameState6 = pledgeFromHex(message6.state) as positions.Reveal;
  expect(gameState6.turnNum).toEqual(6);
  expect(gameState6.stake).toEqual(1);
  expect(gameState6.aPlay).toEqual(Play.Rock);
  expect(gameState6.bPlay).toEqual(Play.Scissors);
  expect(gameState6.resolution).toEqual(aWinsBals);

  gameEngineA.messageSent();

  // In B's application
  const readyToSendResting = gameEngineB.receiveMessage(message6);
  expect(readyToSendResting).toBeInstanceOf(ApplicationStatesB.ReadyToSendResting);
  expect(readyToSendResting.balances).toEqual([6, 3]);
  const message7 = readyToSendResting.message;
  const gameState7 = pledgeFromHex(message7.state);
  expect(gameState7.turnNum).toEqual(7);
  expect(gameState7.resolution).toEqual(aWinsBals);

  // In A's application
  const readyToChoosePlay2 = gameEngineA.receiveMessage(message7);
  expect(readyToChoosePlay2).toBeInstanceOf(ApplicationStatesA.ReadyToChooseAPlay);

  const readyToSendPropose2 = gameEngineA.choosePlay(Play.Paper);
  expect(readyToSendPropose2).toBeInstanceOf(ApplicationStatesA.ReadyToSendPropose);
  expect(readyToSendPropose2.aPlay).toEqual(Play.Paper);
  expect(readyToSendPropose2.message).not.toBeUndefined();
  expect(readyToSendPropose2.salt).not.toBeUndefined();

  const gameState8v0 = pledgeFromHex(readyToSendPropose2.message.state);
  expect(gameState8v0.turnNum).toEqual(8);

  // In B's application
  // const readyToSendConclude = gameEngineB.conclude();

  // todo: put this back in

  // expect(readyToSendConclude instanceof ApplicationStatesB.ReadyToSendConcludeB).toBe(true);
  // expect(readyToSendConclude.message).not.toBeUndefined();
  // const gameState8v1 = pledgeFromHex(readyToSendConclude.message.state);

  // expect(gameState8v1.resolution).toEqual(aWinsBals);
  // expect(gameState8v1.turnNum).toEqual(8);
  // expect(gameState8v1.stateType).toEqual(3);
});
