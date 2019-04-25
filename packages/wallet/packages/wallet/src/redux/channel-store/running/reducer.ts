import * as runningStates from './state';
import * as challengingStates from '../challenging/state';
import * as respondingStates from '../responding/state';
import * as actions from '../../actions';

import { ourTurn, validTransition } from '../../../utils/reducer-utils';
import { signCommitment, validCommitmentSignature } from '../../../utils/signing-utils';
import { challengeRejected, showWallet } from 'magmo-wallet-client/lib/wallet-events';
import { handleSignatureAndValidationMessages } from '../../../utils/state-utils';
import { StateWithSideEffects } from '../../utils';

export const runningReducer = (
  state: runningStates.RunningState,
  action: actions.WalletAction,
): StateWithSideEffects<
  runningStates.RunningState | challengingStates.ApproveChallenge | respondingStates.ChooseResponse
> => {
  return waitForUpdateReducer(state, action);
};

const waitForUpdateReducer = (
  state: runningStates.WaitForUpdate,
  action: actions.WalletAction,
): StateWithSideEffects<
  runningStates.WaitForUpdate | challengingStates.ApproveChallenge | respondingStates.ChooseResponse
> => {
  switch (action.type) {
    case actions.channel.OWN_COMMITMENT_RECEIVED:
      const messageOutbox = handleSignatureAndValidationMessages(state, action);

      // check it's our turn
      if (!ourTurn(state)) {
        return {
          state,
          sideEffects: { messageOutbox },
        };
      }

      // check transition
      if (!validTransition(state, action.commitment)) {
        return {
          state,
          sideEffects: { messageOutbox },
        };
      }

      const signature = signCommitment(action.commitment, state.privateKey);

      return {
        state: runningStates.waitForUpdate({
          ...state,
          turnNum: state.turnNum + 1,
          lastCommitment: { commitment: action.commitment, signature },
          penultimateCommitment: state.lastCommitment,
        }),
        sideEffects: { messageOutbox },
      };

    case actions.channel.OPPONENT_COMMITMENT_RECEIVED:
      const validationMessage = handleSignatureAndValidationMessages(state, action);
      if (ourTurn(state)) {
        return { state, sideEffects: { messageOutbox: validationMessage } };
      }

      // check signature
      if (!action.signature) {
        return { state, sideEffects: { messageOutbox: validationMessage } };
      }
      const messageSignature = action.signature as string;
      const opponentAddress = state.participants[1 - state.ourIndex];
      if (!validCommitmentSignature(action.commitment, messageSignature, opponentAddress)) {
        return { state, sideEffects: { messageOutbox: validationMessage } };
      }

      // check transition
      if (!validTransition(state, action.commitment)) {
        return { state, sideEffects: { messageOutbox: validationMessage } };
      }

      return {
        state: runningStates.waitForUpdate({
          ...state,
          turnNum: state.turnNum + 1,
          lastCommitment: { commitment: action.commitment, signature: messageSignature },
          penultimateCommitment: state.lastCommitment,
        }),
        sideEffects: { messageOutbox: handleSignatureAndValidationMessages(state, action) },
      };

    case actions.CHALLENGE_CREATED_EVENT:
      // transition to responding
      return {
        state: respondingStates.chooseResponse({
          ...state,
          challengeExpiry: action.finalizedAt,
        }),
        sideEffects: { displayOutbox: showWallet() },
      };

    case actions.channel.CHALLENGE_REQUESTED:
      // The application should validate this but just in case we check as well
      if (ourTurn(state)) {
        const message = challengeRejected(
          'Challenges can only be issued when waiting for the other user.',
        );
        return {
          state: runningStates.waitForUpdate({ ...state }),
          sideEffects: { messageOutbox: message },
        };
      }
      // transition to challenging
      return {
        state: challengingStates.approveChallenge({ ...state }),
        sideEffects: { displayOutbox: showWallet() },
      };

    default:
      return { state };
  }
};
