import * as GameEngine from '../GameEngine';
import ChannelWallet from '../../wallet/domain/ChannelWallet';
import Move from '../Move';
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
  const move0 = readyToSendPreFundSetupA.move;
  const gameState0 = pledgeFromHex(move0.state) as positions.PreFundSetup;
  expect(gameState0.turnNum).toEqual(0);
  expect(gameState0.stateCount).toEqual(0);
  expect(gameState0.resolution).toEqual(initialBals);
  expect(gameState0.stake).toEqual(1);

  const waitForPreFundSetupB = gameEngineA.moveSent();
  expect(waitForPreFundSetupB).toBeInstanceOf(ApplicationStatesA.WaitForPreFundSetupB);
  expect(waitForPreFundSetupB.move).toEqual(move0);

  // In B's application
  const gameEngineB = GameEngine.fromProposal({ move: move0, wallet: channelWalletB });
  const readyToSendPreFundSetupB = gameEngineB.state;
  expect(readyToSendPreFundSetupB).toBeInstanceOf(ApplicationStatesB.ReadyToSendPreFundSetupB);
  expect(readyToSendPreFundSetupB.balances).toEqual(initialBals);
  expect(readyToSendPreFundSetupB.channel).toEqual(waitForPreFundSetupB.channel);
  expect(readyToSendPreFundSetupB.stake).toEqual(stake);

  const move1 = readyToSendPreFundSetupB.move as Move;
  const gameState1 = pledgeFromHex(move1.state) as positions.PreFundSetup;
  expect(gameState1.turnNum).toEqual(1);
  expect(gameState1.stateCount).toEqual(1);
  expect(gameState1.resolution).toEqual(initialBals);
  expect(gameState1.stake).toEqual(1);

  const readyToFundB = gameEngineB.moveSent();
  expect(readyToFundB).toBeInstanceOf(ApplicationStatesB.ReadyToFund);
  expect(readyToFundB.balances).toEqual(initialBals);

  // In A's application 
  const readyToFund = gameEngineA.receiveMove(move1);
  expect(readyToFund).toBeInstanceOf(ApplicationStatesA.ReadyToFund);

  const waitForFunding = gameEngineA.fundingRequested();
  expect(waitForFunding).toBeInstanceOf(ApplicationStatesA.WaitForFunding);

  // From the blockchain
  const fundingEvent = { adjudicator: '0xBla', aBalance: 1, bBalance: 2 }; // TODO

  // In A's application
  const readyToSendPostFundSetupA = gameEngineA.fundingConfirmed(fundingEvent);
  expect(readyToSendPostFundSetupA).toBeInstanceOf(ApplicationStatesA.ReadyToSendPostFundSetupA);

  const move2 = readyToSendPostFundSetupA.move;
  expect(move2).not.toBeUndefined();
  const gameState2 = pledgeFromHex(move2.state) as positions.PostFundSetup;
  expect(gameState2.turnNum).toEqual(2);
  expect(gameState2.stateCount).toEqual(0);
  expect(gameState2.resolution).toEqual(initialBals);
  expect(gameState2.stake).toEqual(1);

  const waitForPostFundSetupB = gameEngineA.moveSent();
  expect(waitForPostFundSetupB).toBeInstanceOf(ApplicationStatesA.WaitForPostFundSetupB);
  expect(waitForPostFundSetupB.adjudicator).toEqual(fundingEvent.adjudicator);

  // In B's application
  const waitForFundingB= gameEngineB.fundingRequested();
  expect(waitForFundingB).toBeInstanceOf(ApplicationStatesB.WaitForFunding);

  

  const WaitForPostFundSetupA = gameEngineB.fundingConfirmed(fundingEvent);
  expect(WaitForPostFundSetupA).not.toBeUndefined();
  expect(WaitForPostFundSetupA).toBeInstanceOf(ApplicationStatesB.WaitForPostFundSetupA);
  const readyToSendPostFundSetupB = gameEngineB.receiveMove(move2);
  expect(readyToSendPostFundSetupB).toBeInstanceOf(ApplicationStatesB.ReadyToSendPostFundSetupB);
  expect(readyToSendPostFundSetupB.balances).not.toBeUndefined();
  const move3 = readyToSendPostFundSetupB.move;
  expect(move3).not.toBeUndefined();
  expect(readyToSendPostFundSetupB.balances).toEqual(initialBals);

  const gameState3 = pledgeFromHex(move3.state) as positions.PostFundSetup;
  expect(gameState3.turnNum).toEqual(3);
  expect(gameState3.stateCount).toEqual(1);
  expect(gameState3.resolution).toEqual(initialBals);
  expect(gameState3.stake).toEqual(1);

  const waitForPropose = gameEngineB.moveSent();
  expect(waitForPropose).toBeInstanceOf(ApplicationStatesB.WaitForPropose);

  // In A's application
  const readyToChooseAPlay = gameEngineA.receiveMove(move3);
  expect(readyToChooseAPlay).toBeInstanceOf(ApplicationStatesA.ReadyToChooseAPlay);

  const readyToSendPropose = gameEngineA.choosePlay(Play.Rock);
  expect(readyToSendPropose).toBeInstanceOf(ApplicationStatesA.ReadyToSendPropose);
  expect(readyToSendPropose.aPlay).toEqual(Play.Rock);
  expect(readyToSendPropose.move).not.toBeUndefined();
  expect(readyToSendPropose.salt).not.toBeUndefined();

  const gameState4 = pledgeFromHex(readyToSendPropose.move.state) as positions.Propose;
  expect(gameState4.turnNum).toEqual(4);
  expect(gameState4.stake).toEqual(1);
  expect(gameState4.resolution).toEqual(initialBals);

  const waitForAccept = gameEngineA.moveSent();
  expect(waitForAccept).toBeInstanceOf(ApplicationStatesA.WaitForAccept);
  const proposal = waitForAccept.move;
  expect(proposal).not.toBeUndefined();
  expect(waitForAccept.salt).toEqual(readyToSendPropose.salt);

  // In B's application
  const readyToChooseBPlay = gameEngineB.receiveMove(proposal);
  expect(readyToChooseBPlay).toBeInstanceOf(ApplicationStatesB.ReadyToChooseBPlay);

  const readyToSendAccept = gameEngineB.choosePlay(Play.Scissors);
  expect(readyToSendAccept).toBeInstanceOf(ApplicationStatesB.ReadyToSendAccept);
  const move5 = readyToSendAccept.move;
  const gameState5 = pledgeFromHex(move5.state) as positions.Accept;
  expect(gameState5.turnNum).toEqual(5);
  expect(gameState5.stake).toEqual(1);
  expect(gameState5.resolution).toEqual(bWinsBals);

  const waitForReveal = gameEngineB.moveSent();
  expect(waitForReveal).toBeInstanceOf(ApplicationStatesB.WaitForReveal);
  expect(waitForReveal.bPlay).toEqual(Play.Scissors);
  expect(waitForReveal.move).not.toBeUndefined();

  // In A's application
  const readyToSendReveal = gameEngineA.receiveMove(move5);
  expect(readyToSendReveal).toBeInstanceOf(ApplicationStatesA.ReadyToSendReveal);
  expect(readyToSendReveal.aPlay).toEqual(Play.Rock);
  expect(readyToSendReveal.bPlay).toEqual(Play.Scissors);
  expect(readyToSendReveal.salt).toEqual(waitForAccept.salt);
  expect(readyToSendReveal.result).toEqual(Result.YouWin);

  const move6 = readyToSendReveal.move;
  const gameState6 = pledgeFromHex(move6.state) as positions.Reveal;
  expect(gameState6.turnNum).toEqual(6);
  expect(gameState6.stake).toEqual(1);
  expect(gameState6.aPlay).toEqual(Play.Rock);
  expect(gameState6.bPlay).toEqual(Play.Scissors);
  expect(gameState6.resolution).toEqual(aWinsBals);

  gameEngineA.moveSent();

  // In B's application
  const readyToSendResting = gameEngineB.receiveMove(move6);
  expect(readyToSendResting).toBeInstanceOf(ApplicationStatesB.ReadyToSendResting);
  expect(readyToSendResting.balances).toEqual([6, 3]);
  const move7 = readyToSendResting.move;
  const gameState7 = pledgeFromHex(move7.state);
  expect(gameState7.turnNum).toEqual(7);
  expect(gameState7.resolution).toEqual(aWinsBals);

  // In A's application
  const readyToChoosePlay2 = gameEngineA.receiveMove(move7);
  expect(readyToChoosePlay2).toBeInstanceOf(ApplicationStatesA.ReadyToChooseAPlay);

  const readyToSendPropose2 = gameEngineA.choosePlay(Play.Paper);
  expect(readyToSendPropose2).toBeInstanceOf(ApplicationStatesA.ReadyToSendPropose);
  expect(readyToSendPropose2.aPlay).toEqual(Play.Paper);
  expect(readyToSendPropose2.move).not.toBeUndefined();
  expect(readyToSendPropose2.salt).not.toBeUndefined();

  const gameState8v0 = pledgeFromHex(readyToSendPropose2.move.state);
  expect(gameState8v0.turnNum).toEqual(8);

  // In B's application
  // const readyToSendConclude = gameEngineB.conclude();

  // todo: put this back in

  // expect(readyToSendConclude instanceof ApplicationStatesB.ReadyToSendConcludeB).toBe(true);
  // expect(readyToSendConclude.move).not.toBeUndefined();
  // const gameState8v1 = pledgeFromHex(readyToSendConclude.move.state);

  // expect(gameState8v1.resolution).toEqual(aWinsBals);
  // expect(gameState8v1.turnNum).toEqual(8);
  // expect(gameState8v1.stateType).toEqual(3);
});
