import * as GameEngine from '../GameEngine';
import { PlayerAStateType } from '../application-states/PlayerA';
import { PlayerBStateType } from '../application-states/PlayerB';
import { Play, Result } from '../positions';

const stake = 1;
const initialBals = [5, 4];
const me = '0xa';
const opponent = '0xb';

describe('game engine runthrough', () => {
  const gameEngineA = GameEngine.setupGame({me, opponent, stake, balances: initialBals});
  const aWaitForPreFundSetup = gameEngineA.state;
  // a sends PreFundSetupA to b
  const gameEngineB = GameEngine.fromProposal(aWaitForPreFundSetup.position);
  const bWaitForFunding = gameEngineB.state;
  // b sends PrefundSetupB to a
  const aWaitForFunding = gameEngineA.receivePosition(bWaitForFunding.position);
  // a's wallet says fundingConfirmed
  const aWaitForPostFundSetup = gameEngineA.fundingConfirmed();
  // b's wallet says fundingConfirmed
  const bWaitForPostFundSetup = gameEngineB.fundingConfirmed();
  // a sends PostFundSetupA to b
  const bWaitForPropose = gameEngineB.receivePosition(aWaitForPostFundSetup.position);
  // b sends PostFundSetupB to a
  const aChoosePlay = gameEngineA.receivePosition(bWaitForPropose.position);
  // a chooses Rock
  const aWaitForAccept = gameEngineA.choosePlay(Play.Rock);
  // a sends Propose to b
  const bChoosePlay = gameEngineB.receivePosition(aWaitForAccept.position);
  // b chooses scissors
  const bWaitForReveal = gameEngineB.choosePlay(Play.Scissors);
  // b sends Accept to a
  const aWaitForResting = gameEngineA.receivePosition(bWaitForReveal.position);
  // a sends Reveal to b
  const bViewResult = gameEngineB.receivePosition(aWaitForResting.position);

  // types
  describe('state types', () => {
    const testStateType = (state, type) => {
      it(`creates a state with type ${type} as expected`, () => {
        expect(state.type).toEqual(type);
      });
    };

    testStateType(aWaitForPreFundSetup, PlayerAStateType.WAIT_FOR_PRE_FUND_SETUP);
    testStateType(bWaitForFunding, PlayerBStateType.WAIT_FOR_FUNDING);
    testStateType(aWaitForFunding, PlayerAStateType.WAIT_FOR_FUNDING);
    testStateType(aWaitForPostFundSetup, PlayerAStateType.WAIT_FOR_POST_FUND_SETUP);
    testStateType(bWaitForPostFundSetup, PlayerBStateType.WAIT_FOR_POST_FUND_SETUP);
    testStateType(bWaitForPropose, PlayerBStateType.WAIT_FOR_PROPOSE);
    testStateType(aChoosePlay, PlayerAStateType.CHOOSE_PLAY);
    testStateType(aWaitForAccept, PlayerAStateType.WAIT_FOR_ACCEPT);
    testStateType(bChoosePlay, PlayerBStateType.CHOOSE_PLAY);
    testStateType(bWaitForReveal, PlayerBStateType.WAIT_FOR_REVEAL);
    testStateType(aWaitForResting, PlayerAStateType.WAIT_FOR_RESTING);
    testStateType(bViewResult, PlayerBStateType.VIEW_RESULT);
  });

  // turnNum
  describe('turnNum', () => {
    const testTurnNum = (state, turnNum) => {
      it(`creates the expected balances for state with type ${state.type}`, () => {
        expect(state.turnNum).toEqual(turnNum);
      });
    };

    testTurnNum(aWaitForPreFundSetup, 0);
    testTurnNum(bWaitForFunding, 1);
    testTurnNum(aWaitForFunding, 1);
    testTurnNum(bWaitForPostFundSetup, 1);
    testTurnNum(aWaitForPostFundSetup, 2);
    testTurnNum(bWaitForPropose, 3);
    testTurnNum(aChoosePlay, 3);
    testTurnNum(aWaitForAccept, 4);
    testTurnNum(bChoosePlay, 4);
    testTurnNum(bWaitForReveal, 5);
    testTurnNum(aWaitForResting, 6);
    testTurnNum(bViewResult, 7);
  });

  // balances
  describe('balances', () => {
    const bWinsBals = [4, 5];
    const aWinsBals = [6, 3];

    const testBalances = (state, balances) => {
      it(`creates the expected balances for state with type ${state.type}`, () => {
        expect(state.balances).toEqual(balances);
      });
    };

    testBalances(aWaitForPreFundSetup, initialBals);
    testBalances(bWaitForFunding, initialBals);
    testBalances(aWaitForFunding, initialBals);
    testBalances(aWaitForPostFundSetup, initialBals);
    testBalances(bWaitForPostFundSetup, initialBals);
    testBalances(bWaitForPropose, initialBals);
    testBalances(aChoosePlay, initialBals);
    testBalances(aWaitForAccept, initialBals);
    testBalances(bChoosePlay, initialBals);
    testBalances(bWaitForReveal, bWinsBals);
    testBalances(aWaitForResting, aWinsBals);
    testBalances(bViewResult, aWinsBals);
  });


  // result
  describe('result', () => {
    it('calculates the correct result for player a', () => {
      expect(aWaitForResting.result).toEqual(Result.YouWin);
    });

    it('calculates the correct result for player b', () => {
      expect(bViewResult.result).toEqual(Result.YouLose);
    });
  });

});
