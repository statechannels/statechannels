import { gameReducer } from '../reducer';
import { Player, scenarios, Marks, Imperative, positions, Marker, Result } from '../../../core';
import * as actions from '../actions';
import * as state from '../state';

import {
  itTransitionsTo,
  itIncreasesTurnNumBy,
  itSends,
  itFullySwingsTheBalancesToA,
  itHalfSwingsTheBalancesToA,
  itFullySwingsTheBalancesToB,
  itPreservesOnScreenBalances,
} from './helpers';

const {
  preFundSetupA,
  preFundSetupB,
  postFundSetupB,
  playing1,
  playing2,
  playing8,
  draw,
} = scenarios.standard;

const { againMF, againMS } = scenarios.swapRoles;

const noughtsabsolutevictory = scenarios.noughtsVictory.absolutevictory;

const {
  libraryAddress,
  channelNonce,
  participants,
  roundBuyIn,
  myName,
  opponentName,
  asAddress,
} = scenarios.standard;
const base = {
  libraryAddress,
  channelNonce,
  participants,
  roundBuyIn,
  myName,
  opponentName,
  myAddress: asAddress,
};

const messageState = {};
const fiveFive = scenarios.fiveFive;

describe("player A's app", () => {
  const aProps = {
    ...base,
    stateCount: 1,
    player: Player.PlayerA,
    twitterHandle: 'tweet',
    you: Marker.crosses,
    noughts: 0,
    crosses: 0,
    onScreenBalances: fiveFive,
  };

  describe('when in waitForGameConfirmationA', () => {
    const gameState = state.waitForGameConfirmationA({
      ...aProps,
      ...preFundSetupA,
    });

    describe('when receiving preFundSetupB', () => {
      const action = actions.positionReceived(preFundSetupB);
      const updatedState = gameReducer({ messageState, gameState }, action);

      it('requests funding from the wallet', () => {
        expect(updatedState.messageState.walletOutbox).toEqual({
          type: 'FUNDING_REQUESTED',
        });
      });

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.WaitForFunding, updatedState);
    });
  });

  describe('when in waitForFunding', () => {
    const gameState = state.waitForFunding({ ...aProps, ...preFundSetupB });

    describe('when funding is successful', () => {
      const action = actions.fundingSuccess(postFundSetupB);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.XsPickMove, updatedState);
      itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
    });
  });

  describe('when in XsPickMove', () => {
    describe('when making an inconclusive XS_CHOSE_MOVE', () => {
      const gameState = state.xsPickMove({
        ...aProps,
        noughts: 0,
        crosses: 0,
        ...postFundSetupB,
        turnNum: 3,
        result: Imperative.Wait,
        onScreenBalances: ['', ''],
      });
      const action = actions.marksMade(Marks.tl);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.XsWaitForOpponentToPickMove, updatedState);
      itSends(playing1, updatedState);
      if (gameState.crosses === 0) {
        itHalfSwingsTheBalancesToA(roundBuyIn, { gameState, messageState }, updatedState);
      } else {
        itFullySwingsTheBalancesToA(roundBuyIn, { gameState, messageState }, updatedState);
      }
      itPreservesOnScreenBalances({ gameState, messageState }, updatedState);
    });

    describe('when making a drawing XS_CHOSE_MOVE', () => {
      const gameState = state.xsPickMove({
        ...aProps,
        ...playing8,
        result: Imperative.Wait,
        onScreenBalances: playing8.balances,
      });
      const action = actions.marksMade(Marks.bm);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.WaitToPlayAgain, updatedState);
      itSends(draw, updatedState);
      itHalfSwingsTheBalancesToA(aProps.roundBuyIn, { gameState, messageState }, updatedState);
    });

    describe('when making a winning XS_CHOSE_MOVE', () => {
      const gameState = state.xsPickMove({
        ...aProps,
        ...scenarios.crossesVictory.playing4,
        result: Imperative.Wait,
        onScreenBalances: scenarios.crossesVictory.playing4.balances,
      });
      const action = actions.marksMade(Marks.tr);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.WaitToPlayAgain, updatedState);
      itSends(scenarios.crossesVictory.victory, updatedState);
      itFullySwingsTheBalancesToA(aProps.roundBuyIn, { gameState, messageState }, updatedState);
    });
  });

  describe('when in XsWaitForOpponentToPickMove', () => {
    describe('when inconclusive OPlaying arrives', () => {
      const gameState = state.xsWaitForOpponentToPickMove({
        ...aProps,
        ...playing1,
        result: Imperative.Wait,
        onScreenBalances: playing1.balances,
      });
      const action = actions.positionReceived({ ...playing2 });
      const receivedNoughts = playing2.noughts;

      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.XsPickMove, updatedState);
      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      it('sets theirMarks', () => {
        const newGameState = updatedState.gameState as state.XsPickMove;
        expect(newGameState.noughts).toEqual(receivedNoughts);
      });
      itPreservesOnScreenBalances({ gameState, messageState }, updatedState);
    });

    // a draw cannot arrive if we are Xs

    describe('when Victory arrives', () => {
      const action = actions.positionReceived({
        ...scenarios.noughtsVictory.victory,
      });
      const position = action.position as positions.Victory;
      const receivedNoughts = position.noughts;
      describe('but they still have enough funds to continue', () => {
        const gameState = state.xsWaitForOpponentToPickMove({
          ...aProps,
          ...scenarios.noughtsVictory.playing5,
          result: Imperative.Wait,
          onScreenBalances: ['', ''],
        });
        const updatedState = gameReducer({ messageState, gameState }, action);

        itTransitionsTo(state.StateName.PlayAgain, updatedState);
        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
        const newGameState = updatedState.gameState as state.PlayAgain;
        it('sets theirMarks', () => {
          expect(newGameState.noughts).toEqual(receivedNoughts);
        });
        itFullySwingsTheBalancesToB(roundBuyIn, { gameState, messageState }, updatedState);
      });

      describe('and there are now insufficient funds', () => {
        const gameState = state.xsWaitForOpponentToPickMove({
          ...aProps,
          ...scenarios.noughtsVictory.playing5closetoempty,
          result: Imperative.Wait,
          onScreenBalances: ['', ''],
        });
        const action1 = actions.positionReceived({
          ...scenarios.noughtsVictory.absolutevictory,
        });
        const updatedState = gameReducer({ messageState, gameState }, action1);

        itTransitionsTo(state.StateName.PlayAgain, updatedState);
        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
        itFullySwingsTheBalancesToB(roundBuyIn, { gameState, messageState }, updatedState);
        it('sets theirMarks', () => {
          const newGameState = updatedState.gameState as state.XsPickMove;
          expect(newGameState.noughts).toEqual(receivedNoughts);
        });
      });
    });
  });

  describe('when in PlayAgain', () => {
    const gameState = state.playAgain({
      ...aProps,
      ...draw,
      result: Result.Tie, // here we set Player A is Xs and finalized the board
    });

    gameState.turnNum = gameState.turnNum + 1;

    describe('if the player decides to continue', () => {
      const action = actions.playAgain();
      const updatedState = gameReducer({ messageState, gameState }, action);
      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itSends(againMS, updatedState);
      itTransitionsTo(state.StateName.OsWaitForOpponentToPickMove, updatedState);
    });
  });

  describe('when in Wait To Play Again', () => {
    const gameState = state.waitToPlayAgain({
      ...aProps,
      ...draw,
      result: Result.Tie, // here we set Player A is Xs and finalized the board
    });
    describe('when PlayAgainMeFirst arrives', () => {
      const action = actions.positionReceived(againMF);
      const updatedState = gameReducer({ messageState, gameState }, action);
      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.PlayAgain, updatedState);
    });
  });

  describe('when in Wait To Play Again, and without sufficient funds', () => {
    const gameState = state.waitToPlayAgain({
      ...aProps,
      ...noughtsabsolutevictory,
      result: Result.YouLose,
    });

    describe('when the player launches a challenge', () => {
      const action = actions.createChallenge();
      const updatedState = gameReducer({ messageState, gameState }, action);

      // itTransitionsTo(state.StateName.WaitForWithdrawal, updatedState);
      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);

      it('requests a challenge in the wallet', () => {
        expect(updatedState.messageState.walletOutbox).toEqual({ type: 'CHALLENGE_REQUESTED' });
      });
    });
  });
});
