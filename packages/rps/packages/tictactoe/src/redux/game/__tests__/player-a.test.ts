import { gameReducer, youWentLast } from "../reducer";
import {
  Player,
  scenarios,
  Marks,
  Imperative,
  positions,
  Marker,
  Result
} from "../../../core";
import * as actions from "../actions";
import * as state from "../state";
import BN from "bn.js";
import bnToHex from "../../../utils/bnToHex";

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
  preFundSetupA,
  preFundSetupB,
  // postFundSetupA,
  postFundSetupB,
  playing1,
  playing2,
  // playing3,
  // playing4,
  playing5,
  // playing6,
  // playing7,
  playing8,
  draw,
} = scenarios.standard;

const {
  resting2,
  resting3,
} = scenarios.swapRoles;

// const noughtsabsolutevictory = scenarios.noughtsVictory.absolutevictory;
const noughtsconclude = scenarios.noughtsVictory.conclude;

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
const oneFive = [new BN(1), new BN(5)].map(bnToHex) as [string, string];

describe("player A's app", () => {
  const aProps = {
    ...base,
    stateCount: 1,
    player: Player.PlayerA,
    twitterHandle: "tweet",
    you: Marker.crosses,
    noughts: 0,
    crosses: 0,
    onScreenBalances: fiveFive,
  };

  describe("when in waitForGameConfirmationA", () => {
    const gameState = state.waitForGameConfirmationA({
      ...aProps,
      ...preFundSetupA,
    });

    describe("when receiving preFundSetupB", () => {
      const action = actions.positionReceived(preFundSetupB);
      const updatedState = gameReducer({ messageState, gameState }, action);

      it("requests funding from the wallet", () => {
        expect(updatedState.messageState.walletOutbox).toEqual({
          type: "FUNDING_REQUESTED",
        });
      });

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.WaitForFunding, updatedState);
    });
  });

  describe("when in waitForFunding", () => {
    const gameState = state.waitForFunding({ ...aProps, ...preFundSetupB });

    describe("when funding is successful", () => {
      const action = actions.fundingSuccess(postFundSetupB);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.XsPickMove, updatedState);
      itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
    });
  });

  describe("when in XsPickMove", () => {
    describe("when making an inconclusive XS_CHOSE_MOVE", () => {
      const gameState = state.xsPickMove({
        ...aProps,
        noughts: 0,
        crosses: 0,
        ...postFundSetupB,
        turnNum: 3,
        result: Imperative.Wait,
        onScreenBalances: ["", ""],
      });
      const action = actions.marksMade(Marks.tl);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(
        state.StateName.XsWaitForOpponentToPickMove,
        updatedState
      );
      itSends(playing1, updatedState);
      if (gameState.crosses === 0) {
        itHalfSwingsTheBalancesToA(
          roundBuyIn,
          { gameState, messageState },
          updatedState
        );
      } else {
        itFullySwingsTheBalancesToA(
          roundBuyIn,
          { gameState, messageState },
          updatedState
        );
      }
      itPreservesOnScreenBalances({ gameState, messageState }, updatedState);
    });

    describe("when making a drawing XS_CHOSE_MOVE", () => {
      const gameState = state.xsPickMove({
        ...aProps,
        ...playing8,
        result: Imperative.Wait,
        onScreenBalances: playing8.balances,
      });
      const action = actions.marksMade(Marks.bm);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.PlayAgain, updatedState);
      itSends(draw, updatedState);
      itHalfSwingsTheBalancesToA(
        aProps.roundBuyIn,
        { gameState, messageState },
        updatedState
      );
    });

    describe("when making a winning XS_CHOSE_MOVE", () => {
      const gameState = state.xsPickMove({
        ...aProps,
        ...scenarios.crossesVictory.playing4,
        result: Imperative.Wait,
        onScreenBalances: scenarios.crossesVictory.playing4.balances,
      });
      const action = actions.marksMade(Marks.tr);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.PlayAgain, updatedState);
      itSends(scenarios.crossesVictory.victory, updatedState);
      itFullySwingsTheBalancesToA(
        aProps.roundBuyIn,
        { gameState, messageState },
        updatedState
      );
    });
  });

  describe("when in XsWaitForOpponentToPickMove", () => {
    describe("when inconclusive Oplaying arrives", () => {
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
      it("sets theirMarks", () => {
        const newGameState = updatedState.gameState as state.XsPickMove;
        expect(newGameState.noughts).toEqual(receivedNoughts);
      });
      itPreservesOnScreenBalances({ gameState, messageState }, updatedState);
    });

    // a draw cannot arrive if we are Xs

    describe("when Victory arrives", () => {
      const action = actions.positionReceived({
        ...scenarios.noughtsVictory.victory,
      });
      const position = action.position as positions.Victory;
      const receivedNoughts = position.noughts;
      describe("but they still have enough funds to continue", () => {
        const gameState = state.xsWaitForOpponentToPickMove({
          ...aProps,
          ...scenarios.noughtsVictory.playing5,
          result: Imperative.Wait,
          onScreenBalances: ["", ""],
        });
        const updatedState = gameReducer({ messageState, gameState }, action);

        itTransitionsTo(state.StateName.PlayAgain, updatedState);
        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
        const newGameState = updatedState.gameState as state.PlayAgain;
        it("sets theirMarks", () => {
          expect(newGameState.noughts).toEqual(receivedNoughts);
        });
        itFullySwingsTheBalancesToB(
          roundBuyIn,
          { gameState, messageState },
          updatedState
        );
      });

      describe("and there are now insufficient funds", () => {
        const gameState = state.xsWaitForOpponentToPickMove({
          ...aProps,
          ...scenarios.noughtsVictory.playing5closetoempty,
          result: Imperative.Wait,
          onScreenBalances: ["", ""],
        });
        const action1 = actions.positionReceived({
          ...scenarios.noughtsVictory.absolutevictory,
        });
        const updatedState = gameReducer({ messageState, gameState }, action1);

        itTransitionsTo(state.StateName.InsufficientFunds, updatedState);
        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
        itFullySwingsTheBalancesToB(
          roundBuyIn,
          { gameState, messageState },
          updatedState
        );
        it("sets theirMarks", () => {
          const newGameState = updatedState.gameState as state.XsPickMove;
          expect(newGameState.noughts).toEqual(receivedNoughts);
        });
      });
    });
  });

  describe("when in PlayAgain", () => {
    const gameState = state.playAgain({
      ...aProps,
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
      ...aProps,
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

  describe("when in InsufficientFunds", () => {
    const gameState = state.insufficientFunds({
      ...aProps,
      ...playing5,
      result: Result.YouLose,
      roundBuyIn,
      balances: oneFive,
    });

    describe("when Conclude arrives", () => {
      const action = actions.positionReceived(noughtsconclude);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
      // itSends(noughtsabsolutevictory, updatedState);
      itTransitionsTo(state.StateName.GameOver, updatedState);
    });
  });

  // describe("when in GameOver", () => {
  //   const gameState = state.gameOver({
  //     ...aProps,
  //     ...noughtsabsolutevictory,
  //     result: Result.YouLose,
  //   });

  //   describe("when the player wants to withdraw their funds", () => {
  //     const action = actions.withdrawalRequest();
  //     const updatedState = gameReducer({ messageState, gameState }, action);

  //     itTransitionsTo(state.StateName.WaitForWithdrawal, updatedState);
  //     itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);

  //     it("requests a withdrawal from the wallet", () => {
  //       expect(updatedState.messageState.walletOutbox).toEqual({
  //         type: "WITHDRAWAL_REQUESTED",
  //       });
  //     });
  //   });
  // });
});
