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
import { NextChannelState } from '../../shared/state';

export const respondingReducer = (
  state: states.RespondingState,
  action: WalletAction,
): NextChannelState<states.ChannelState> => {
  // Handle any signature/validation request centrally to avoid duplicating code for each state
  if (
    action.type === actions.OWN_COMMITMENT_RECEIVED ||
    action.type === actions.OPPONENT_COMMITMENT_RECEIVED
  ) {
    return {
      channelState: state,
      outboxState: { messageOutbox: handleSignatureAndValidationMessages(state, action) },
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
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const transactionOutbox = createRespondWithMoveTransaction(
        state.lastCommitment.commitment,
        state.lastCommitment.signature,
      );
      return {
        channelState: states.initiateResponse(state),
        outboxState: { transactionOutbox },
      };
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { channelState: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { channelState: state };
      }
  }
  return { channelState: state };
};

export const chooseResponseReducer = (
  state: states.ChooseResponse,
  action: WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.RESPOND_WITH_MOVE_CHOSEN:
      return {
        channelState: states.takeMoveInApp(state),
        outboxState: { messageOutbox: challengeResponseRequested(), displayOutbox: hideWallet() },
      };
    case actions.RESPOND_WITH_EXISTING_MOVE_CHOSEN:
      const transaction = createRespondWithMoveTransaction(
        state.lastCommitment.commitment,
        state.lastCommitment.signature,
      );
      return {
        channelState: states.initiateResponse(state),
        outboxState: { transactionOutbox: transaction },
      };
    case actions.RESPOND_WITH_REFUTE_CHOSEN:
      return { channelState: states.initiateResponse(state) };
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { channelState: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { channelState: state };
      }
    default:
      return { channelState: state };
  }
};

export const takeMoveInAppReducer = (
  state: states.TakeMoveInApp,
  action: WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.CHALLENGE_COMMITMENT_RECEIVED:
      // check it's our turn
      if (!ourTurn(state)) {
        return { channelState: state };
      }

      // check transition
      if (!validTransition(state, action.commitment)) {
        return { channelState: state };
      }

      const signature = signCommitment(action.commitment, state.privateKey);
      const transaction = createRespondWithMoveTransaction(action.commitment, signature);
      return {
        channelState: states.initiateResponse({
          ...state,
          turnNum: state.turnNum + 1,
          lastCommitment: { commitment: action.commitment, signature },
          penultimateCommitment: state.lastCommitment,
        }),
        outboxState: { transactionOutbox: transaction, displayOutbox: showWallet() },
      };

    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { channelState: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { channelState: state };
      }
    default:
      return { channelState: state };
  }
};

export const initiateResponseReducer = (
  state: states.InitiateResponse,
  action: WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return { channelState: states.waitForResponseSubmission(state) };
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { channelState: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { channelState: state };
      }
    default:
      return { channelState: state };
  }
};

export const waitForResponseSubmissionReducer = (
  state: states.WaitForResponseSubmission,
  action: WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.TRANSACTION_SUBMITTED:
      return {
        channelState: states.waitForResponseConfirmation({
          ...state,
          transactionHash: action.transactionHash,
        }),
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { channelState: states.responseTransactionFailed(state) };
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { channelState: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { channelState: state };
      }
    default:
      return { channelState: state };
  }
};

export const waitForResponseConfirmationReducer = (
  state: states.WaitForResponseConfirmation,
  action: WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return { channelState: states.challengeeAcknowledgeChallengeTimeOut(state) };
      } else {
        return { channelState: state };
      }
    case actions.TRANSACTION_CONFIRMED:
      return { channelState: states.acknowledgeChallengeComplete(state) };
    default:
      return { channelState: state };
  }
};

export const acknowledgeChallengeCompleteReducer = (
  state: states.AcknowledgeChallengeComplete,
  action: WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.CHALLENGE_RESPONSE_ACKNOWLEDGED:
      return {
        channelState: states.waitForUpdate(state),
        outboxState: { messageOutbox: challengeComplete(), displayOutbox: hideWallet() },
      };
    default:
      return { channelState: state };
  }
};

const challengeeAcknowledgeChallengeTimeoutReducer = (
  state: states.ChallengeeAcknowledgeChallengeTimeout,
  action: WalletAction,
): NextChannelState<states.ChannelState> => {
  switch (action.type) {
    case actions.CHALLENGE_TIME_OUT_ACKNOWLEDGED:
      return {
        channelState: states.approveWithdrawal(state),
        outboxState: { messageOutbox: challengeComplete() },
      };
    default:
      return { channelState: state };
  }
};
