import * as runningStates from './state';
import * as challengingStates from '../challenging/state';
import * as respondingStates from '../responding/state';
import * as actions from '../../actions';

import { ourTurn, validTransition } from '../../../utils/reducer-utils';
import { signCommitment, validCommitmentSignature } from '../../../utils/signing-utils';
import { challengeRejected, showWallet } from 'magmo-wallet-client/lib/wallet-events';
import { handleSignatureAndValidationMessages } from '../../../utils/state-utils';
import { NextChannelState } from '../../shared/state';

export const runningReducer = (
  state: runningStates.RunningState,
  action: actions.WalletAction,
): NextChannelState<
  runningStates.RunningState | challengingStates.ApproveChallenge | respondingStates.ChooseResponse
> => {
  return waitForUpdateReducer(state, action);
};

const waitForUpdateReducer = (
  state: runningStates.WaitForUpdate,
  action: actions.WalletAction,
): NextChannelState<
  runningStates.WaitForUpdate | challengingStates.ApproveChallenge | respondingStates.ChooseResponse
> => {
  switch (action.type) {
    case actions.OWN_COMMITMENT_RECEIVED:
      const messageOutbox = handleSignatureAndValidationMessages(state, action);

      // check it's our turn
      if (!ourTurn(state)) {
        return {
          channelState: state,
          outboxState: { messageOutbox },
        };
      }

      // check transition
      if (!validTransition(state, action.commitment)) {
        return {
          channelState: state,
          outboxState: { messageOutbox },
        };
      }

      const signature = signCommitment(action.commitment, state.privateKey);

      return {
        channelState: runningStates.waitForUpdate({
          ...state,
          turnNum: state.turnNum + 1,
          lastCommitment: { commitment: action.commitment, signature },
          penultimateCommitment: state.lastCommitment,
        }),
        outboxState: { messageOutbox },
      };

    case actions.OPPONENT_COMMITMENT_RECEIVED:
      const validationMessage = handleSignatureAndValidationMessages(state, action);
      if (ourTurn(state)) {
        return { channelState: state, outboxState: { messageOutbox: validationMessage } };
      }

      // check signature
      if (!action.signature) {
        return { channelState: state, outboxState: { messageOutbox: validationMessage } };
      }
      const messageSignature = action.signature as string;
      const opponentAddress = state.participants[1 - state.ourIndex];
      if (!validCommitmentSignature(action.commitment, messageSignature, opponentAddress)) {
        return { channelState: state, outboxState: { messageOutbox: validationMessage } };
      }

      // check transition
      if (!validTransition(state, action.commitment)) {
        return { channelState: state, outboxState: { messageOutbox: validationMessage } };
      }

      return {
        channelState: runningStates.waitForUpdate({
          ...state,
          turnNum: state.turnNum + 1,
          lastCommitment: { commitment: action.commitment, signature: messageSignature },
          penultimateCommitment: state.lastCommitment,
        }),
        outboxState: { messageOutbox: handleSignatureAndValidationMessages(state, action) },
      };

    case actions.CHALLENGE_CREATED_EVENT:
      // transition to responding
      return {
        channelState: respondingStates.chooseResponse({
          ...state,
          challengeExpiry: action.finalizedAt,
        }),
        outboxState: { displayOutbox: showWallet() },
      };

    case actions.CHALLENGE_REQUESTED:
      // The application should validate this but just in case we check as well
      if (ourTurn(state)) {
        const message = challengeRejected(
          'Challenges can only be issued when waiting for the other user.',
        );
        return {
          channelState: runningStates.waitForUpdate({ ...state }),
          outboxState: { messageOutbox: message },
        };
      }
      // transition to challenging
      return {
        channelState: challengingStates.approveChallenge({ ...state }),
        outboxState: { displayOutbox: showWallet() },
      };

    default:
      return { channelState: state };
  }
};
