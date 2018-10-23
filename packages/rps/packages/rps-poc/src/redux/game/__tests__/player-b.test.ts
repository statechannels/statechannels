import { gameReducer } from '../reducer';
import { Player, scenarios } from '../../../core';
import * as actions from '../actions';
import * as state from '../state';

import {
  itSends,
  itTransitionsTo,
  itStoresAction,
  itCanHandleTheOpponentResigning,
} from './helpers';

const {
  preFundSetupA,
  preFundSetupB,
  postFundSetupA,
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
  conclude: concludeResign,
} = scenarios.bResignsAfterOneRound;

const {
  accept: acceptInsufficientFunds,
  reveal: revealInsufficientFunds,
  conclude: concludeInsufficientFunds,
  conclude2: concludeInsufficientFunds2,

} = scenarios.insufficientFunds;

const { libraryAddress, channelNonce, participants, roundBuyIn, myName, opponentName } = scenarios.standard;
const base = { libraryAddress, channelNonce, participants, roundBuyIn, myName, opponentName };

const messageState = { };

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
  };
  describe('when in confirmGameB', () => {
    const gameState = state.confirmGameB({...bProps});

    itCanHandleTheOpponentResigning({ gameState, messageState });

    describe('when player B confirms', () => {
      const action = actions.confirmGame();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itSends(preFundSetupB, updatedState);

      it('requests funding from the wallet', () => {
        expect(updatedState.messageState.walletOutbox).toEqual('FUNDING_REQUESTED');
      });

      itTransitionsTo(state.StateName.WaitForFunding, updatedState);
    });
  });

  describe('when in waitForFunding', () => {
    const gameState = state.waitForFunding({...bProps, ...preFundSetupB });

    itCanHandleTheOpponentResigning({ gameState, messageState });

    describe('when funding is successful', () => {
      const action = actions.fundingSuccess();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.WaitForPostFundSetup, updatedState);
    });
  });

  describe('when in WaitForPostFundSetup', () => {
    const gameState = state.waitForPostFundSetup({...bProps, ...preFundSetupB});
    itCanHandleTheOpponentResigning({ gameState, messageState });

    describe('when PostFundSetupA arrives', () => {
      const action = actions.positionReceived(postFundSetupA);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.PickMove, updatedState);
      itSends(postFundSetupB, updatedState);
    });
  });

  describe('when in PickMove', () => {
    const gameState = state.pickMove({...bProps, ...postFundSetupB });

    itCanHandleTheOpponentResigning({ gameState, messageState });

    describe('when a move is chosen', () => {
      const action = actions.chooseMove(bsMove);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.WaitForOpponentToPickMoveB, updatedState);

      it('stores the move', () => {
        const updatedGameState = updatedState.gameState as state.WaitForOpponentToPickMoveA;
        expect(updatedGameState.myMove).toEqual(bsMove);
      });
    });

    describe('if Propose arrives', () => {
      const action = actions.positionReceived(propose);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itStoresAction(action, updatedState);

      describe('when a move is chosen', () => {
        const action2 = actions.chooseMove(bsMove);
        const updatedState2 = gameReducer(updatedState, action2);

        itSends(accept, updatedState2);
        itTransitionsTo(state.StateName.WaitForRevealB, updatedState2);
      });
    });
  });

  describe('when in WaitForOpponentToPickMoveB', () => {
    const gameState = state.waitForOpponentToPickMoveB({ ...bProps, ...postFundSetupB });

    itCanHandleTheOpponentResigning({ gameState, messageState });

    describe('when Propose arrives', () => {
      const action = actions.positionReceived(propose);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itSends(accept, updatedState);
      itTransitionsTo(state.StateName.WaitForRevealB, updatedState);
    });
  });

  describe('when in WaitForRevealB', () => {
    const gameState = state.waitForRevealB({ ...bProps, ...accept});

    itCanHandleTheOpponentResigning({ gameState, messageState });

    describe('when Reveal arrives', () => {
      describe('if there are sufficient funds', () => {
        const action = actions.positionReceived(reveal);
        const updatedState = gameReducer({ messageState, gameState }, action);

        itTransitionsTo(state.StateName.PlayAgain, updatedState);
      });

      describe('if there are not sufficient funds', () => {
        const action = actions.positionReceived(revealInsufficientFunds);
        const gameState2 = {
          ...gameState,
          balances: acceptInsufficientFunds.balances };
        const updatedState = gameReducer({ messageState, gameState: gameState2 }, action);

        itSends(concludeInsufficientFunds, updatedState);
        itTransitionsTo(state.StateName.InsufficientFunds, updatedState);
      });
    });
  });

  describe('when in PlayAgain', () => {
    const gameState = state.playAgain({ ...bProps, ...reveal });

    itCanHandleTheOpponentResigning({ gameState, messageState });

    describe('if the player decides to continue', () => {
      const action = actions.playAgain();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itSends(resting, updatedState);
      itTransitionsTo(state.StateName.PickMove, updatedState);
    });

    describe('if the player decides not to continue', () => {
      const action = actions.resign();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itSends(concludeResign, updatedState);
      itTransitionsTo(state.StateName.WaitForResignationAcknowledgement, updatedState);
    });
  });

  describe('when in InsufficientFunds', () => {
    const gameState = state.insufficientFunds({ ...bProps, ...revealInsufficientFunds });

    describe('when Conclude arrives', () => {
      const action = actions.positionReceived(concludeInsufficientFunds2);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.GameOver, updatedState);
    });
  });

  describe('when in WaitForResignationAcknowledgement', () => {
    const gameState = state.waitForResignationAcknowledgement({ ...bProps, ...conclude });

    // todo: is this right? seems like it shouldn't handle it
    // itCanHandleTheOpponentResigning({ gameState, messageState });

    describe('when Conclude arrives', () => {
      const action = actions.positionReceived(conclude);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.GameOver, updatedState);
    });
  });

  describe('when in GameOver', () => {
    const gameState = state.gameOver({...bProps, ...conclude });

    describe('when the player wants to withdraw their funds', () => {
      const action = actions.withdrawalRequest();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.WaitForWithdrawal, updatedState);

      it('requests a withdrawal from the wallet', () => {
        expect(updatedState.messageState.walletOutbox).toEqual('WITHDRAWAL');
      });
    });
  });
});
