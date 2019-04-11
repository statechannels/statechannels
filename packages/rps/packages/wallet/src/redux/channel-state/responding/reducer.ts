import * as states from '../state';
import { WalletAction } from '../../actions';
import * as actions from '../../actions';
import { unreachable, ourTurn, validTransition } from '../../../utils/reducer-utils';
import { signCommitment } from '../../../utils/signing-utils';
import { createRespondWithMoveTransaction } from '../../../utils/transaction-generator';
import {
  challengeResponseRequested,
  challengeComplete,
  hideWallet,
  showWallet,
} from 'magmo-wallet-client/lib/wallet-events';
import { handleSignatureAndValidationMessages } from '../../../utils/state-utils';
import { StateWithSideEffects } from '../../utils';
import { WalletProtocol } from '../../types';

export const respondingReducer = (
  state: states.RespondingState,
  action: WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  // Handle any signature/validation request centrally to avoid duplicating code for each state
  if (
    action.type === actions.channel.OWN_COMMITMENT_RECEIVED ||
    action.type === actions.channel.OPPONENT_COMMITMENT_RECEIVED
  ) {
    return {
      state,
      sideEffects: { messageOutbox: handleSignatureAndValidationMessages(state, action) },
    };
  }

  switch (state.type) {
    case states.CHOOSE_RESPONSE:
      return chooseResponseReducer(state, action);
    case states.TAKE_MOVE_IN_APP:
      return takeMoveInAppReducer(state, action);
    case states.INITIATE_RESPONSE:
      return initiateResponseReducer(state, action);
    case states.WAIT_FOR_RESPONSE_SUBMISSION:
      return waitForResponseSubmissionReducer(state, action);
    case states.WAIT_FOR_RESPONSE_CONFIRMATION:
      return waitForResponseConfirmationReducer(state, action);
    case states.CHALLENGEE_ACKNOWLEDGE_CHALLENGE_TIMEOUT:
      return challengeeAcknowledgeChallengeTimeoutReducer(state, action);
    case states.ACKNOWLEDGE_CHALLENGE_COMPLETE:
      return acknowledgeChallengeCompleteReducer(state, action);
    case states.RESPONSE_TRANSACTION_FAILED:
      return responseTransactionFailedReducer(state, action);
    default:
      return unreachable(state);
  }
};

const responseTransactionFailedReducer = (
  state: states.ResponseTransactionFailed,
  action: WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const transactionRequest = createRespondWithMoveTransaction(
        state.lastCommitment.commitment,
        state.lastCommitment.signature,
      );
      return {
        state: states.initiateResponse(state),
        // TODO: This will be factored out as channel reducers should not be sending transactions itself
        sideEffects: {
          transactionOutbox: {
            transactionRequest,
            channelId: state.channelId,
            protocol: WalletProtocol.Responding,
          },
        },
      };
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { state: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { state };
      }
  }
  return { state };
};

export const chooseResponseReducer = (
  state: states.ChooseResponse,
  action: WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.channel.RESPOND_WITH_MOVE_CHOSEN:
      return {
        state: states.takeMoveInApp(state),
        sideEffects: { messageOutbox: challengeResponseRequested(), displayOutbox: hideWallet() },
      };
    case actions.channel.RESPOND_WITH_EXISTING_MOVE_CHOSEN:
      const transactionRequest = createRespondWithMoveTransaction(
        state.lastCommitment.commitment,
        state.lastCommitment.signature,
      );
      return {
        state: states.initiateResponse(state),
        // TODO: This will be factored out as channel reducers should not be sending transactions itself
        sideEffects: {
          transactionOutbox: {
            transactionRequest,
            channelId: state.channelId,
            protocol: WalletProtocol.Responding,
          },
        },
      };
    case actions.channel.RESPOND_WITH_REFUTE_CHOSEN:
      return { state: states.initiateResponse(state) };
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { state: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { state };
      }
    default:
      return { state };
  }
};

export const takeMoveInAppReducer = (
  state: states.TakeMoveInApp,
  action: WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.channel.CHALLENGE_COMMITMENT_RECEIVED:
      // check it's our turn
      if (!ourTurn(state)) {
        return { state };
      }

      // check transition
      if (!validTransition(state, action.commitment)) {
        return { state };
      }

      const signature = signCommitment(action.commitment, state.privateKey);
      const transactionRequest = createRespondWithMoveTransaction(action.commitment, signature);
      return {
        state: states.initiateResponse({
          ...state,
          turnNum: state.turnNum + 1,
          lastCommitment: { commitment: action.commitment, signature },
          penultimateCommitment: state.lastCommitment,
        }),
        sideEffects: {
          transactionOutbox: {
            transactionRequest,
            channelId: state.channelId,
            protocol: WalletProtocol.Responding,
          },
          displayOutbox: showWallet(),
        },
      };

    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { state: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { state };
      }
    default:
      return { state };
  }
};

export const initiateResponseReducer = (
  state: states.InitiateResponse,
  action: WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return { state: states.waitForResponseSubmission(state) };
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { state: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { state };
      }
    default:
      return { state };
  }
};

export const waitForResponseSubmissionReducer = (
  state: states.WaitForResponseSubmission,
  action: WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.TRANSACTION_SUBMITTED:
      return {
        state: states.waitForResponseConfirmation({
          ...state,
          transactionHash: action.transactionHash,
        }),
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { state: states.responseTransactionFailed(state) };
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { state: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { state };
      }
    default:
      return { state };
  }
};

export const waitForResponseConfirmationReducer = (
  state: states.WaitForResponseConfirmation,
  action: WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { state: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { state };
      }
    case actions.TRANSACTION_CONFIRMED:
      return { state: states.acknowledgeChallengeComplete(state) };
    default:
      return { state };
  }
};

export const acknowledgeChallengeCompleteReducer = (
  state: states.AcknowledgeChallengeComplete,
  action: WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.channel.CHALLENGE_RESPONSE_ACKNOWLEDGED:
      return {
        state: states.waitForUpdate(state),
        sideEffects: { messageOutbox: challengeComplete(), displayOutbox: hideWallet() },
      };
    default:
      return { state };
  }
};

const challengeeAcknowledgeChallengeTimeoutReducer = (
  state: states.ChallengeeAcknowledgeChallengeTimeout,
  action: WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.channel.CHALLENGE_TIME_OUT_ACKNOWLEDGED:
      return {
        state: states.approveWithdrawal(state),
        sideEffects: { messageOutbox: challengeComplete() },
      };
    default:
      return { state };
  }
};
