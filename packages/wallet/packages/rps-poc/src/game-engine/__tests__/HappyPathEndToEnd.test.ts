import * as GameEngine from '../GameEngine';
import * as ApplicationStatesA from '../application-states/PlayerA';
import * as ApplicationStatesB from '../application-states/PlayerB';
import { Play, Result } from '../positions';
import * as positions from '../positions';

const stake = 1;
const initialBals = [5, 4];
const bWinsBals = [4, 5];
const aWinsBals = [6, 3];
const me = '0xa';
const opponent = '0xb';

it('runthrough', () => {
  // In A's application
  const gameEngineA = GameEngine.setupGame({me, opponent, stake, balances: initialBals});
  const readyToSendPreFundSetupA = gameEngineA.state;
  expect(readyToSendPreFundSetupA).toBeInstanceOf(ApplicationStatesA.ReadyToSendPreFundSetupA);

  const position0 = readyToSendPreFundSetupA.position;
  expect(position0.turnNum).toEqual(0);
  expect(position0.stateCount).toEqual(0);
  expect(position0.resolution).toEqual(initialBals);
  expect(position0.stake).toEqual(1);

  const waitForPreFundSetupB = gameEngineA.positionSent();
  expect(waitForPreFundSetupB).toBeInstanceOf(ApplicationStatesA.WaitForPreFundSetupB);
  expect(waitForPreFundSetupB.position).toEqual(position0);

  // In B's application
  const gameEngineB = GameEngine.fromProposal(position0);
  const readyToSendPreFundSetupB = gameEngineB.state;
  expect(readyToSendPreFundSetupB).toBeInstanceOf(ApplicationStatesB.ReadyToSendPreFundSetupB);
  expect(readyToSendPreFundSetupB.balances).toEqual(initialBals);
  expect(readyToSendPreFundSetupB.channel).toEqual(waitForPreFundSetupB.channel);
  expect(readyToSendPreFundSetupB.stake).toEqual(stake);

  const position1 = readyToSendPreFundSetupB.position as positions.PreFundSetup;
  expect(position1.turnNum).toEqual(1);
  expect(position1.stateCount).toEqual(1);
  expect(position1.resolution).toEqual(initialBals);
  expect(position1.stake).toEqual(1);

  const readyToFundB = gameEngineB.positionSent();
  expect(readyToFundB).toBeInstanceOf(ApplicationStatesB.ReadyToFund);
  expect(readyToFundB.balances).toEqual(initialBals);

  // In A's application 
  const readyToFund = gameEngineA.receivePosition(position1);
  expect(readyToFund).toBeInstanceOf(ApplicationStatesA.ReadyToFund);

  const waitForFunding = gameEngineA.fundingRequested();
  expect(waitForFunding).toBeInstanceOf(ApplicationStatesA.WaitForFunding);

  // From the blockchain
  const fundingEvent = { adjudicator: '0xBla', aBalance: 1, bBalance: 2 }; // TODO

  // In A's application
  const readyToSendPostFundSetupA = gameEngineA.fundingConfirmed(fundingEvent);
  expect(readyToSendPostFundSetupA).toBeInstanceOf(ApplicationStatesA.ReadyToSendPostFundSetupA);

  const position2 = readyToSendPostFundSetupA.position;
  expect(position2).not.toBeUndefined();
  expect(position2.turnNum).toEqual(2);
  expect(position2.stateCount).toEqual(0);
  expect(position2.resolution).toEqual(initialBals);
  expect(position2.stake).toEqual(1);

  const waitForPostFundSetupB = gameEngineA.positionSent();
  expect(waitForPostFundSetupB).toBeInstanceOf(ApplicationStatesA.WaitForPostFundSetupB);

  // In B's application
  const waitForFundingB= gameEngineB.fundingRequested();
  expect(waitForFundingB).toBeInstanceOf(ApplicationStatesB.WaitForFunding);

  

  const WaitForPostFundSetupA = gameEngineB.fundingConfirmed(fundingEvent);
  expect(WaitForPostFundSetupA).not.toBeUndefined();
  expect(WaitForPostFundSetupA).toBeInstanceOf(ApplicationStatesB.WaitForPostFundSetupA);
  const readyToSendPostFundSetupB = gameEngineB.receivePosition(position2);
  expect(readyToSendPostFundSetupB).toBeInstanceOf(ApplicationStatesB.ReadyToSendPostFundSetupB);
  expect(readyToSendPostFundSetupB.balances).not.toBeUndefined();

  const position3 = readyToSendPostFundSetupB.position;
  expect(position3).not.toBeUndefined();
  expect(readyToSendPostFundSetupB.balances).toEqual(initialBals);
  expect(position3.turnNum).toEqual(3);
  expect(position3.stateCount).toEqual(1);
  expect(position3.resolution).toEqual(initialBals);
  expect(position3.stake).toEqual(1);

  const waitForPropose = gameEngineB.positionSent();
  expect(waitForPropose).toBeInstanceOf(ApplicationStatesB.WaitForPropose);

  // In A's application
  const readyToChooseAPlay = gameEngineA.receivePosition(position3);
  expect(readyToChooseAPlay).toBeInstanceOf(ApplicationStatesA.ReadyToChooseAPlay);

  const readyToSendPropose = gameEngineA.choosePlay(Play.Rock);
  expect(readyToSendPropose).toBeInstanceOf(ApplicationStatesA.ReadyToSendPropose);
  expect(readyToSendPropose.aPlay).toEqual(Play.Rock);
  expect(readyToSendPropose.position).not.toBeUndefined();
  expect(readyToSendPropose.salt).not.toBeUndefined();

  const position4 = readyToSendPropose.position;
  expect(position4.turnNum).toEqual(4);
  expect(position4.stake).toEqual(1);
  expect(position4.resolution).toEqual(initialBals);

  const waitForAccept = gameEngineA.positionSent();
  expect(waitForAccept).toBeInstanceOf(ApplicationStatesA.WaitForAccept);
  const proposal = waitForAccept.position;
  expect(proposal).not.toBeUndefined();
  expect(waitForAccept.salt).toEqual(readyToSendPropose.salt);

  // In B's application
  const readyToChooseBPlay = gameEngineB.receivePosition(proposal);
  expect(readyToChooseBPlay).toBeInstanceOf(ApplicationStatesB.ReadyToChooseBPlay);

  const readyToSendAccept = gameEngineB.choosePlay(Play.Scissors);
  expect(readyToSendAccept).toBeInstanceOf(ApplicationStatesB.ReadyToSendAccept);
  const position5 = readyToSendAccept.position;
  expect(position5.turnNum).toEqual(5);
  expect(position5.stake).toEqual(1);
  expect(position5.resolution).toEqual(bWinsBals);

  const waitForReveal = gameEngineB.positionSent();
  expect(waitForReveal).toBeInstanceOf(ApplicationStatesB.WaitForReveal);
  expect(waitForReveal.bPlay).toEqual(Play.Scissors);
  expect(waitForReveal.position).not.toBeUndefined();

  // In A's application
  const readyToSendReveal = gameEngineA.receivePosition(position5);
  expect(readyToSendReveal).toBeInstanceOf(ApplicationStatesA.ReadyToSendReveal);
  expect(readyToSendReveal.aPlay).toEqual(Play.Rock);
  expect(readyToSendReveal.bPlay).toEqual(Play.Scissors);
  expect(readyToSendReveal.salt).toEqual(waitForAccept.salt);
  expect(readyToSendReveal.result).toEqual(Result.YouWin);

  const position6 = readyToSendReveal.position;
  expect(position6.turnNum).toEqual(6);
  expect(position6.stake).toEqual(1);
  expect(position6.aPlay).toEqual(Play.Rock);
  expect(position6.bPlay).toEqual(Play.Scissors);
  expect(position6.resolution).toEqual(aWinsBals);

  gameEngineA.positionSent();

  // In B's application
  const readyToSendResting = gameEngineB.receivePosition(position6);
  expect(readyToSendResting).toBeInstanceOf(ApplicationStatesB.ReadyToSendResting);
  expect(readyToSendResting.balances).toEqual([6, 3]);
  const position7 = readyToSendResting.position;
  expect(position7.turnNum).toEqual(7);
  expect(position7.resolution).toEqual(aWinsBals);

  // In A's application
  const readyToChoosePlay2 = gameEngineA.receivePosition(position7);
  expect(readyToChoosePlay2).toBeInstanceOf(ApplicationStatesA.ReadyToChooseAPlay);

  const readyToSendPropose2 = gameEngineA.choosePlay(Play.Paper);
  expect(readyToSendPropose2).toBeInstanceOf(ApplicationStatesA.ReadyToSendPropose);
  expect(readyToSendPropose2.aPlay).toEqual(Play.Paper);
  expect(readyToSendPropose2.position).not.toBeUndefined();
  expect(readyToSendPropose2.salt).not.toBeUndefined();

  const position8v0 = readyToSendPropose2.position;
  expect(position8v0.turnNum).toEqual(8);

  // In B's application
  // const readyToSendConclude = gameEngineB.conclude();

  // todo: put this back in

  // expect(readyToSendConclude instanceof ApplicationStatesB.ReadyToSendConcludeB).toBe(true);
  // expect(readyToSendConclude.position).not.toBeUndefined();
  // const position8v1 = pledgeFromHex(readyToSendConclude.position.state);

  // expect(position8v1.resolution).toEqual(aWinsBals);
  // expect(position8v1.turnNum).toEqual(8);
  // expect(position8v1.stateType).toEqual(3);
});
