import { gameReducer } from '../reducer';
import { Player, scenarios } from '../../../core';
import * as actions from '../actions';
import * as state from '../state';

import {
  itSends,
  itTransitionsTo,
  itStoresAction,
  itIncreasesTurnNumBy,
} from './helpers';

const {
  preFundSetupA,
  preFundSetupB,
  postFundSetupB,
  asMove,
  bsMove,
  bResult,
  propose,
  accept,
  reveal,
  conclude,
  resting,
} = scenarios.aResignsAfterOneRound;

const {
} = scenarios.bResignsAfterOneRound;

const {
  accept: acceptInsufficientFunds,
  reveal: revealInsufficientFunds,
  conclude: concludeInsufficientFunds,
  conclude2: concludeInsufficientFunds2,

} = scenarios.insufficientFunds;

const { libraryAddress, channelNonce, participants, roundBuyIn, myName, opponentName } = scenarios.standard;
const base = { libraryAddress, channelNonce, participants, roundBuyIn, myName, opponentName };

const messageState = {};

describe('player B\'s app', () => {
  const bProps = {
    ...base,
    player: Player.PlayerB as Player.PlayerB,
    turnNum: 0,
    balances: preFundSetupA.balances,
    stateCount: 0,
    latestPosition: preFundSetupA,
    myMove: bsMove,
    theirMove: asMove,
    result: bResult,
    twitterHandle: "tweet",
  };
  describe('when in confirmGameB', () => {
    const gameState = state.confirmGameB({ ...bProps });

    describe('when player B confirms', () => {
      const action = actions.confirmGame();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itSends(preFundSetupB, updatedState);
      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);

      it('requests funding from the wallet', () => {
        expect(updatedState.messageState.walletOutbox).toEqual({ type: 'FUNDING_REQUESTED' });
      });

      itTransitionsTo(state.StateName.WaitForFunding, updatedState);
    });
  });

  describe('when in waitForFunding', () => {
    const gameState = state.waitForFunding({ ...bProps, ...preFundSetupB });

    describe('when funding is successful', () => {
      const action = actions.fundingSuccess(postFundSetupB);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.PickMove, updatedState);
    });
  });

  describe('when in PickMove', () => {
    const gameState = state.pickMove({ ...bProps, ...postFundSetupB });

    describe('when a move is chosen', () => {
      const action = actions.chooseMove(bsMove);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.WaitForOpponentToPickMoveB, updatedState);

      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);
      it('stores the move', () => {
        const updatedGameState = updatedState.gameState as state.WaitForOpponentToPickMoveA;
        expect(updatedGameState.myMove).toEqual(bsMove);
      });
      it('doesn\'t send anything', () => {
        expect(updatedState.messageState).toEqual(messageState);
      });
    });

    describe('if Propose arrives', () => {
      const action = actions.positionReceived(propose);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itStoresAction(action, updatedState);
      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);

      describe('when a move is chosen', () => {
        const action2 = actions.chooseMove(bsMove);
        const updatedState2 = gameReducer(updatedState, action2);

        itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState2);
        itSends(accept, updatedState2);
        itTransitionsTo(state.StateName.WaitForRevealB, updatedState2);
        it('clears the action', () => {
          expect(updatedState2.messageState.actionToRetry).toBe(undefined);
        });
      });
    });
  });

  describe('when in WaitForOpponentToPickMoveB', () => {
    const gameState = state.waitForOpponentToPickMoveB({ ...bProps, ...postFundSetupB });

    describe('when Propose arrives', () => {
      const action = actions.positionReceived(propose);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
      itSends(accept, updatedState);
      itTransitionsTo(state.StateName.WaitForRevealB, updatedState);
    });
  });

  describe('when in WaitForRevealB', () => {
    const gameState = state.waitForRevealB({ ...bProps, ...accept });

    describe('when Reveal arrives', () => {
      describe('if there are sufficient funds', () => {
        const action = actions.positionReceived(reveal);
        const updatedState = gameReducer({ messageState, gameState }, action);

        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
        itTransitionsTo(state.StateName.PlayAgain, updatedState);
      });

      describe('if there are not sufficient funds', () => {
        const action = actions.positionReceived(revealInsufficientFunds);
        const gameState2 = {
          ...gameState,
          balances: acceptInsufficientFunds.balances,
        };
        const updatedState = gameReducer({ messageState, gameState: gameState2 }, action);

        itIncreasesTurnNumBy(2, { gameState: gameState2, messageState }, updatedState);
        itSends(concludeInsufficientFunds, updatedState);
        itTransitionsTo(state.StateName.InsufficientFunds, updatedState);
      });
    });
  });

  describe('when in PlayAgain', () => {
    const gameState = state.playAgain({ ...bProps, ...reveal });

    describe('if the player decides to continue', () => {
      const action = actions.playAgain();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itSends(resting, updatedState);
      // is this right?
      itTransitionsTo(state.StateName.PickMove, updatedState);
    });
  });

  describe('when in InsufficientFunds', () => {
    const gameState = state.insufficientFunds({ ...bProps, ...concludeInsufficientFunds });

    describe('when Conclude arrives', () => {
      const action = actions.positionReceived(concludeInsufficientFunds2);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.GameOver, updatedState);
    });
  });

  describe('when in GameOver', () => {
    const gameState = state.gameOver({ ...bProps, ...conclude });

    describe('when the player wants to withdraw their funds', () => {
      const action = actions.withdrawalRequest();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.WaitForWithdrawal, updatedState);

      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);
      it('requests a withdrawal from the wallet', () => {
        expect(updatedState.messageState.walletOutbox).toEqual({ type: 'WITHDRAWAL_REQUESTED' });
      });
    });
  });
});
