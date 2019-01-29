import { gameReducer, youWentLast } from "../reducer";
import {
  Player,
  scenarios,
  Marks,
  Imperative,
  Result,
  positions,
  Marker
} from "../../../core";
import * as actions from "../actions";
import * as state from "../state";

import {
  // itSends,
  itTransitionsTo,
  // itStoresAction,
  itIncreasesTurnNumBy,
  // itHandlesResignLikeItsMyTurn,
  // itHandlesResignLikeItsTheirTurn,
  itSends,
  itFullySwingsTheBalancesToA,
  itHalfSwingsTheBalancesToA,
  itFullySwingsTheBalancesToB,
  itPreservesOnScreenBalances
} from "./helpers";

const {
  // preFundSetupA,
  preFundSetupB,
  // postFundSetupA,
  postFundSetupB,
  playing1,
  playing2,
  playing3,
  // playing4,
  // playing5,
  // playing6,
  // playing7,
  playing8,
  draw,
  // resting,
} = scenarios.standard;

const {
  resting2,
  resting3,
} = scenarios.swapRoles;

const {
  libraryAddress,
  channelNonce,
  participants,
  roundBuyIn,
  myName,
  opponentName,
  bsAddress,
} = scenarios.standard;

const base = {
  libraryAddress,
  channelNonce,
  participants,
  roundBuyIn,
  myName,
  opponentName,
  myAddress: bsAddress,
};

const messageState = {};
const fiveFive = scenarios.fiveFive;
const noughtsabsolutevictory = scenarios.noughtsVictory.absolutevictory;

describe("player B's app", () => {
  const bProps = {
    ...base,
    stateCount: 1,
    turnNum: 0,
    player: Player.PlayerB,
    twitterHandle: "tweet",
    you: Marker.noughts,
    noughts: 0,
    crosses: 0,
    balances: fiveFive,
    onScreenBalances: fiveFive,
  };

  describe("when in confirmGameB", () => {
    const gameState = state.confirmGameB({ ...bProps });

    describe("when player B confirms", () => {
      const action = actions.confirmGame();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itSends(preFundSetupB, updatedState);
      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);

      it("requests funding from the wallet", () => {
        expect(updatedState.messageState.walletOutbox).toEqual({
          type: "FUNDING_REQUESTED",
        });
      });

      itTransitionsTo(state.StateName.WaitForFunding, updatedState);
    });
  });

  describe("when in waitForFunding", () => {
    const gameState = state.waitForFunding({ ...bProps, ...preFundSetupB });
    describe('when a position is received', () => {
      const action = actions.positionReceived(playing1);
      const updatedState = gameReducer({ messageState, gameState }, action);
      it('stores the action in actionToRetry', () => {
        expect(updatedState.messageState.actionToRetry).toEqual(action);
      });
  });

    describe("when funding is successful", () => {
      const action = actions.fundingSuccess(postFundSetupB);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
      itTransitionsTo(
        state.StateName.OsWaitForOpponentToPickMove,
        updatedState
      );
    });
  });

  describe("when in OsPickMove", () => {
    describe("when making an inconclusive OS_CHOSE_MOVE", () => {
      const gameState = state.osPickMove({
        ...bProps,
        ...playing1,
        result: Imperative.Wait,
        onScreenBalances: ["", ""],
      });
      const action = actions.marksMade(Marks.mm);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(
        state.StateName.OsWaitForOpponentToPickMove,
        updatedState
      );
      itSends(playing2, updatedState);
      itPreservesOnScreenBalances({ gameState, messageState }, updatedState);
    });

    describe("when making a winning OS_CHOSE_MOVE", () => {
      const gameState = state.osPickMove({
        ...bProps,
        ...scenarios.noughtsVictory.playing5,
        result: Result.YouWin,
        onScreenBalances: ["", ""],
      });
      const action = actions.marksMade(Marks.tr);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.PlayAgain, updatedState);
      itSends(scenarios.noughtsVictory.victory, updatedState);
      itFullySwingsTheBalancesToB(
        bProps.roundBuyIn,
        { gameState, messageState },
        updatedState
      );
    });
  });

  describe("when in OsWaitForOpponentToPickMove", () => {
    describe("when inconclusive Xplaying arrives", () => {
      const gameState = state.osWaitForOpponentToPickMove({
        ...bProps,
        ...playing2,
        result: Imperative.Wait,
        onScreenBalances: ["", ""],
      });
      const action = actions.positionReceived({ ...playing3 });
      const position = action.position as positions.Xplaying;
      const receivedCrosses = position.crosses;

      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.OsPickMove, updatedState);
      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      it("sets theirMarks", () => {
        const newGameState = updatedState.gameState as state.OsPickMove;
        expect(newGameState.crosses).toEqual(receivedCrosses);
      });
      itPreservesOnScreenBalances({ gameState, messageState }, updatedState);
    });

    describe("when Draw arrives", () => {
      const gameState = state.osWaitForOpponentToPickMove({
        ...bProps,
        ...playing8,
        result: Imperative.Wait,
        onScreenBalances: ["", ""],
      });
      const action = actions.positionReceived({ ...draw });
      const position = action.position as positions.Xplaying;
      const receivedCrosses = position.crosses;
      const updatedState = gameReducer({ messageState, gameState }, action);
      itTransitionsTo(state.StateName.PlayAgain, updatedState);
      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      it("sets theirMarks", () => {
        const newGameState = updatedState.gameState as state.OsPickMove;
        expect(newGameState.crosses).toEqual(receivedCrosses);
      });
      itHalfSwingsTheBalancesToA(
        roundBuyIn,
        { gameState, messageState },
        updatedState
      );
    });

    describe("when Victory arrives", () => {
      const action = actions.positionReceived({
        ...scenarios.crossesVictory.victory,
      });
      const position = action.position as positions.Xplaying;
      const receivedCrosses = position.crosses;

      describe("but they still have enough funds to continue", () => {
        const gameState = state.osWaitForOpponentToPickMove({
          ...bProps,
          ...scenarios.crossesVictory.playing4,
          result: Imperative.Wait,
          onScreenBalances: ["", ""],
        });
        const updatedState = gameReducer({ messageState, gameState }, action);

        itTransitionsTo(state.StateName.PlayAgain, updatedState);
        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
        it("sets theirMarks", () => {
          const newGameState = updatedState.gameState as state.OsPickMove;
          expect(newGameState.crosses).toEqual(receivedCrosses);
        });
        itFullySwingsTheBalancesToA(
          roundBuyIn,
          { gameState, messageState },
          updatedState
        );
      });

      describe("and there are now insufficient funds", () => {
        const gameState = state.osWaitForOpponentToPickMove({
          ...bProps,
          ...scenarios.crossesVictory.playing4closetoempty,
          result: Imperative.Wait,
          onScreenBalances: ["", ""],
        });
        const action2 = actions.positionReceived({
          ...scenarios.crossesVictory.absolutevictory,
        });
        const updatedState = gameReducer({ messageState, gameState }, action2);

        itTransitionsTo(state.StateName.GameOver, updatedState);
        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
        itFullySwingsTheBalancesToA(
          roundBuyIn,
          { gameState, messageState },
          updatedState
        );
        it("sets theirMarks", () => {
          const newGameState = updatedState.gameState as state.OsPickMove;
          expect(newGameState.crosses).toEqual(receivedCrosses);
        });
      });
    });
  });

  describe("when in PlayAgain", () => {
    const gameState = state.playAgain({
      ...bProps,
      ...draw,
      result: Result.Tie,
    });

    describe("if the player decides to continue", () => {
      const action = actions.playAgain();
      const updatedState = gameReducer({ messageState, gameState }, action);
      if (!youWentLast(gameState)) {
        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
        itSends(resting2, updatedState);
      }
      else {
        itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);
      }
      itTransitionsTo(state.StateName.WaitToPlayAgain, updatedState);
    });

  });

  describe("when in Wait To Play Again", () => {
    const gameState = state.waitToPlayAgain({
      ...bProps,
      ...draw,
      result: Result.Tie,
    });
    describe("when resting arrives", () => {
      const action = actions.positionReceived(resting2);
      const updatedState = gameReducer({ messageState, gameState }, action);
      if (youWentLast(gameState)) {
        itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
        itSends(resting3, updatedState);
        itTransitionsTo(state.StateName.OsWaitForOpponentToPickMove, updatedState);
      }
      else {
        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
        itTransitionsTo(state.StateName.XsPickMove, updatedState);
      }
    });
  });

  describe('when in GameOver', () => {
    const gameState = state.gameOver({ ...bProps, ...noughtsabsolutevictory, result: Result.YouLose });

    describe('when the player wants to finish the game', () => {
      const action = actions.resign();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.WaitForWithdrawal, updatedState);
      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);

      it('requests a conclude from the wallet', () => {
        expect(updatedState.messageState.walletOutbox).toEqual({ type: 'CONCLUDE_REQUESTED' });
      });
    });
  });

});
