import { gameReducer } from '../reducer';
import { Player } from '../../../core';
import * as scenarios from '../../../core/test-scenarios';
import * as actions from '../actions';
import * as state from '../state';

import { itSends, itTransitionsTo, itStoresAction, itIncreasesTurnNumBy } from './helpers';

const {
  preFundSetupA,
  preFundSetupB,
  postFundSetupB,
  aWeapon,
  bWeapon,
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
} = scenarios.insufficientFunds;

const {
  channel,
  destination,
  roundBuyIn,
  myName,
  opponentName,
  asAddress: myAddress,
} = scenarios.standard;
const base = {
  libraryAddress: channel.channelType,
  channelNonce: channel.nonce,
  participants: destination,
  roundBuyIn,
  myName,
  opponentName,
  myAddress,
};

const messageState = {};

describe("player A's app", () => {
  const aProps = {
    ...base,
    commitmentCount: 0,
    player: Player.PlayerA as Player.PlayerA,
    myWeapon: aWeapon,
    theirWeapon: bWeapon,
    result: aResult,
    twitterHandle: 'tweet',
    destination,
  };

  describe('when in waitForGameConfirmationA', () => {
    const gameState = state.waitForGameConfirmationA({ ...aProps, ...preFundSetupA });

    describe('when receiving preFundSetupB', () => {
      const action = actions.commitmentReceived(preFundSetupB);
      const updatedState = gameReducer({ messageState, gameState }, action);

      it('requests funding from the wallet', () => {
        expect(updatedState.messageState.walletOutbox).toEqual({ type: 'FUNDING_REQUESTED' });
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

      itTransitionsTo(state.StateName.PickWeapon, updatedState);
      itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
    });
  });

  describe('when in PickWeapon', () => {
    const gameState = state.pickWeapon({ ...aProps, ...postFundSetupB });

    describe('when a move is chosen', () => {
      const action = actions.chooseWeapon(aWeapon);
      // todo: will need to stub out the randomness in the salt somehow
      const updatedState = gameReducer({ messageState, gameState }, action);

      itSends(propose, updatedState);
      itTransitionsTo(state.StateName.WaitForOpponentToPickWeaponA, updatedState);
      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);

      it('stores the move and salt', () => {
        const newGameState = updatedState.gameState as state.WaitForOpponentToPickWeaponA;
        expect(newGameState.myWeapon).toEqual(aWeapon);
        expect(newGameState.salt).toEqual(salt);
      });
    });
  });

  describe('when in WaitForOpponentToPickWeaponA', () => {
    const gameState = state.waitForOpponentToPickWeaponA({ ...aProps, ...propose, salt });

    describe('when Accept arrives', () => {
      describe('when enough funds to continue', () => {
        const action = actions.commitmentReceived(accept);

        const updatedState = gameReducer({ messageState, gameState }, action);

        itSends(reveal, updatedState);
        itTransitionsTo(state.StateName.PlayAgain, updatedState);
        itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
        it('sets theirWeapon and the result', () => {
          const newGameState = updatedState.gameState as state.PlayAgain;
          expect(newGameState.theirWeapon).toEqual(bWeapon);
          expect(newGameState.result).toEqual(aResult);
        });
      });

      describe('when not enough funds to continue', () => {
        const action = actions.commitmentReceived(acceptInsufficientFunds);
        const gameState2 = {
          ...gameState,
          balances: proposeInsufficientFunds.allocation,
          latestPosition: proposeInsufficientFunds,
        };
        const updatedState = gameReducer({ messageState, gameState: gameState2 }, action);

        itIncreasesTurnNumBy(2, { gameState, messageState }, updatedState);
        itSends(revealInsufficientFunds, updatedState);
        itTransitionsTo(state.StateName.GameOver, updatedState);
      });
    });
  });

  describe('when in PlayAgain', () => {
    const gameState = state.playAgain({ ...aProps, ...reveal });

    describe('if the player decides to continue', () => {
      const action = actions.playAgain();
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.WaitForRestingA, updatedState);
    });

    describe('if Resting arrives', () => {
      const action = actions.commitmentReceived(resting);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itStoresAction(action, updatedState);
      itIncreasesTurnNumBy(0, { gameState, messageState }, updatedState);

      describe('if the player decides to continue', () => {
        const playAction = actions.playAgain();
        const updatedState2 = gameReducer(updatedState, playAction);

        itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState2);
        itTransitionsTo(state.StateName.PickWeapon, updatedState2);
      });
    });
  });

  describe('when in WaitForRestingA', () => {
    const gameState = state.waitForRestingA({ ...aProps, ...reveal });

    describe('when resting arrives', () => {
      const action = actions.commitmentReceived(resting);
      const updatedState = gameReducer({ messageState, gameState }, action);

      itIncreasesTurnNumBy(1, { gameState, messageState }, updatedState);
      itTransitionsTo(state.StateName.PickWeapon, updatedState);
    });
  });

  describe('when in GameOver', () => {
    const gameState = state.gameOver({ ...aProps, ...conclude });

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
