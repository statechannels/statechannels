import { gameReducer } from '../reducer';
import { Player, scenarios } from '../../../core';
import * as actions from '../actions';
import * as state from '../state';

import {
  itSends,
  itTransitionsTo,
  itStoresAction,
  itIncreasesTurnNumBy,
  itHandlesResignLikeItsMyTurn,
  itHandlesResignLikeItsTheirTurn,
} from './helpers';

const {
  preFundSetupA,
  preFundSetupB,
  postFundSetupA,
  postFundSetupB,
  asMove,
  bsMove,
  salt,
  aResult,
  propose,
  accept,
  reveal,
  resting,
  conclude,
} = scenarios.aResignsAfterOneRound;

const {
  propose: proposeInsufficientFunds,
  accept: acceptInsufficientFunds,
  reveal: revealInsufficientFunds,
  conclude: concludeInsufficientFunds,
  conclude2: concludeInsufficientFunds2,
} = scenarios.insufficientFunds;

const { libraryAddress, channelNonce, participants, roundBuyIn, myName, opponentName } = scenarios.standard;
const base = { libraryAddress, channelNonce, participants, roundBuyIn, myName, opponentName };

const messageState = { };

describe('player A\'s app', () => {
  const aProps = {
    ...base,
    stateCount: 0,
    player: Player.PlayerA as Player.PlayerA,
    myMove: asMove,
    theirMove: bsMove,
    result: aResult,
    twitterHandle: 'tweet',
  };

  describe('when in waitForGameConfirmationA', () => {
    const gameState = state.waitForGameConfirmationA({...aProps, ...preFundSetupA });

    describe('when receiving preFundSetupB', () => {
      const action = actions.positionReceived(preFundSetupB);
      const updatedState = gameReducer({ messageState, gameState }, action);

      it('requests funding from the wallet', () => {
        expect(updatedState.messageState.walletOutbox).toEqual('FUNDING_REQUESTED');
      });

      itIncreasesTurnNumBy(1, {gameState, messageState}, updatedState);
      itTransitionsTo(state.StateName.WaitForFunding, updatedState);
    });

    itHandlesResignLikeItsTheirTurn(gameState, messageState);
  });

  describe('when in waitForFunding', () => {
    const gameState = state.waitForFunding({...aProps, ...preFundSetupB });

    describe('when funding is successful', () => {
      const action = actions.fundingSuccess();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itSends(postFundSetupA, updatedState);
      itTransitionsTo(state.StateName.WaitForPostFundSetup, updatedState);
      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
    });

    itHandlesResignLikeItsMyTurn(gameState, messageState);
  });

  describe('when in WaitForPostFundSetup', () => {
    const gameState = state.waitForPostFundSetup({...aProps, ...postFundSetupA });

    describe('when PostFundSetupB arrives', () => {
      const action = actions.positionReceived(postFundSetupB);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.PickMove, updatedState);
    });

    itHandlesResignLikeItsTheirTurn(gameState, messageState);
  });

  describe('when in PickMove', () => {
    const gameState = state.pickMove({...aProps, ...postFundSetupB });

    describe('when a move is chosen', () => {
      const action = actions.chooseMove(asMove);
      // todo: will need to stub out the randomness in the salt somehow
      const updatedState = gameReducer({ messageState, gameState }, action);

      itSends(propose, updatedState);
      itTransitionsTo(state.StateName.WaitForOpponentToPickMoveA, updatedState);
      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);

      it('stores the move and salt', () => {
        const newGameState = updatedState.gameState as state.WaitForOpponentToPickMoveA;
        expect(newGameState.myMove).toEqual(asMove);
        expect(newGameState.salt).toEqual(salt);
      });

    });

    itHandlesResignLikeItsMyTurn(gameState, messageState);
  });

  describe('when in WaitForOpponentToPickMoveA', () => {
    const gameState = state.waitForOpponentToPickMoveA({...aProps, ...propose, salt });

    describe('when Accept arrives', () => {
      describe('when enough funds to continue', () => {
        const action = actions.positionReceived(accept);

        const updatedState = gameReducer({ messageState, gameState }, action);

        itSends(reveal, updatedState);
        itTransitionsTo(state.StateName.PlayAgain, updatedState);
        itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
        it('sets theirMove and the result', () => {
          const newGameState = updatedState.gameState as state.PlayAgain;
          expect(newGameState.theirMove).toEqual(bsMove);
          expect(newGameState.result).toEqual(aResult);
        });
      });

      describe('when not enough funds to continue', () => {
        const action = actions.positionReceived(acceptInsufficientFunds);
        const gameState2 = {
          ...gameState,
          balances: proposeInsufficientFunds.balances,
          latestPosition: proposeInsufficientFunds,
        };
        const updatedState = gameReducer({ messageState, gameState: gameState2 }, action);

        itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
        itSends(revealInsufficientFunds, updatedState);
        itTransitionsTo(state.StateName.InsufficientFunds, updatedState);
      });
    });

    itHandlesResignLikeItsTheirTurn(gameState, messageState);
  });

  describe('when in PlayAgain', () => {
    const gameState = state.playAgain({...aProps, ...reveal });

    describe('if the player decides to continue', () => {
      const action = actions.playAgain();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.WaitForRestingA, updatedState);
    });

    describe('if the player decides not to continue', () => {
      const action = actions.resign();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.WaitToResign, updatedState);
      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);
    });

    describe('if Resting arrives', () => {
      const action = actions.positionReceived(resting);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itStoresAction(action, updatedState);
      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);

      describe('if the player decides to continue', () => {
        const playAction = actions.playAgain();
        const updatedState2 = gameReducer(updatedState, playAction);

        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState2);
        itTransitionsTo(state.StateName.PickMove, updatedState2);
      });

      describe('if the player decides not to continue', () => {
        const resignAction = actions.resign();
        const updatedState2 = gameReducer(updatedState, resignAction);

        itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState2);
        itSends(conclude, updatedState2);
        itTransitionsTo(state.StateName.WaitForResignationAcknowledgement, updatedState2);
      });
    });
  });

  describe('when in WaitForRestingA', () => {
    const gameState = state.waitForRestingA({...aProps, ...reveal });

    describe('when resting arrives', () => {
      const action = actions.positionReceived(resting);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.PickMove, updatedState);
    });

    itHandlesResignLikeItsTheirTurn(gameState, messageState);
  });


  describe('when in WaitToResign', () => {
    const gameState = state.waitToResign({...aProps, ...reveal });

    describe('when any position arrives', () => {
      const action = actions.positionReceived(resting);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
      itSends(conclude, updatedState);
      itTransitionsTo(state.StateName.WaitForResignationAcknowledgement, updatedState);
    });
  });


  describe('when in InsufficientFunds', () => {
    const gameState = state.insufficientFunds({...aProps, ...revealInsufficientFunds });

    describe('when Conclude arrives', () => {
      const action = actions.positionReceived(concludeInsufficientFunds);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
      itSends(concludeInsufficientFunds2, updatedState);
      itTransitionsTo(state.StateName.GameOver, updatedState);
    });
  });

  describe('when in WaitForResignationAcknowledgement', () => {
    const gameState = state.waitForResignationAcknowledgement({ ...aProps, ...conclude });

    describe('when Conclude arrives', () => {
      const action = actions.positionReceived(conclude);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.GameOver, updatedState);
    });
  });

  describe('when in GameOver', () => {
    const gameState = state.gameOver({ ...aProps, ...conclude });

    describe('when the player wants to withdraw their funds', () => {
      const action = actions.withdrawalRequest();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itTransitionsTo(state.StateName.WaitForWithdrawal, updatedState);
      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);

      it('requests a withdrawal from the wallet', () => {
        expect(updatedState.messageState.walletOutbox).toEqual('WITHDRAWAL_REQUESTED');
      });
    });
  });
});
