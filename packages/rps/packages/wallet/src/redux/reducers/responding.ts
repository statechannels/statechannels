import { WalletState, RespondingState } from '../states';
import * as states from '../states/responding';
import * as runningStates from '../states/running';
import * as withdrawalStates from '../states/withdrawing';

import { WalletAction } from '../actions';
import * as actions from '../actions';
import { unreachable, ourTurn, validTransition } from '../../utils/reducer-utils';
import { signCommitment } from '../../utils/signing-utils';
import { createRespondWithMoveTransaction } from '../../utils/transaction-generator';
import {
  challengeResponseRequested,
  challengeComplete,
  hideWallet,
  showWallet,
} from 'magmo-wallet-client/lib/wallet-events';
import { handleSignatureAndValidationMessages } from '../../utils/state-utils';

export const respondingReducer = (state: RespondingState, action: WalletAction): WalletState => {
  // Handle any signature/validation request centrally to avoid duplicating code for each state
  if (
    action.type === actions.OWN_COMMITMENT_RECEIVED ||
    action.type === actions.OPPONENT_COMMITMENT_RECEIVED
  ) {
    return { ...state, messageOutbox: handleSignatureAndValidationMessages(state, action) };
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
) => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const transaction = createRespondWithMoveTransaction(
        state.adjudicator,
        state.lastCommitment.commitment,
        state.lastCommitment.signature,
      );
      return states.initiateResponse({
        ...state,
        transactionOutbox: transaction,
      });
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return states.challengeeAcknowledgeChallengeTimeOut({ ...state });
      } else {
        return state;
      }
  }
  return state;
};

export const chooseResponseReducer = (
  state: states.ChooseResponse,
  action: WalletAction,
): WalletState => {
  switch (action.type) {
    case actions.RESPOND_WITH_MOVE_CHOSEN:
      return states.takeMoveInApp({
        ...state,
        messageOutbox: challengeResponseRequested(),
        displayOutbox: hideWallet(),
      });
    case actions.RESPOND_WITH_EXISTING_MOVE_CHOSEN:
      const transaction = createRespondWithMoveTransaction(
        state.adjudicator,
        state.lastCommitment.commitment,
        state.lastCommitment.signature,
      );
      return states.initiateResponse({
        ...state,
        transactionOutbox: transaction,
      });
    case actions.RESPOND_WITH_REFUTE_CHOSEN:
      return states.initiateResponse(state);
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return states.challengeeAcknowledgeChallengeTimeOut({ ...state });
      } else {
        return state;
      }
    default:
      return state;
  }
};

export const takeMoveInAppReducer = (
  state: states.TakeMoveInApp,
  action: WalletAction,
): WalletState => {
  switch (action.type) {
    case actions.CHALLENGE_COMMITMENT_RECEIVED:
      // check it's our turn
      if (!ourTurn(state)) {
        return state;
      }

      // check transition
      if (!validTransition(state, action.commitment)) {
        return state;
      }

      const signature = signCommitment(action.commitment, state.privateKey);
      const transaction = createRespondWithMoveTransaction(
        state.adjudicator,
        action.commitment,
        signature,
      );
      return states.initiateResponse({
        ...state,
        turnNum: state.turnNum + 1,
        lastCommitment: { commitment: action.commitment, signature },
        penultimateCommitment: state.lastCommitment,
        transactionOutbox: transaction,
        displayOutbox: showWallet(),
      });

    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return states.challengeeAcknowledgeChallengeTimeOut({ ...state });
      } else {
        return state;
      }
    default:
      return state;
  }
};

export const initiateResponseReducer = (
  state: states.InitiateResponse,
  action: WalletAction,
): WalletState => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return states.waitForResponseSubmission(state);
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return states.challengeeAcknowledgeChallengeTimeOut({ ...state });
      } else {
        return state;
      }
    default:
      return state;
  }
};

export const waitForResponseSubmissionReducer = (
  state: states.WaitForResponseSubmission,
  action: WalletAction,
): WalletState => {
  switch (action.type) {
    case actions.TRANSACTION_SUBMITTED:
      return states.waitForResponseConfirmation({
        ...state,
        transactionHash: action.transactionHash,
      });
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return states.responseTransactionFailed(state);
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return states.challengeeAcknowledgeChallengeTimeOut({ ...state });
      } else {
        return state;
      }
    default:
      return state;
  }
};

export const waitForResponseConfirmationReducer = (
  state: states.WaitForResponseConfirmation,
  action: WalletAction,
): WalletState => {
  switch (action.type) {
    case actions.BLOCK_MINED:
      if (
        typeof state.challengeExpiry !== 'undefined' &&
        action.block.timestamp >= state.challengeExpiry
      ) {
        return states.challengeeAcknowledgeChallengeTimeOut({ ...state });
      } else {
        return state;
      }
    case actions.TRANSACTION_CONFIRMED:
      return states.acknowledgeChallengeComplete(state);
    default:
      return state;
  }
};

export const acknowledgeChallengeCompleteReducer = (
  state: states.AcknowledgeChallengeComplete,
  action: WalletAction,
): WalletState => {
  switch (action.type) {
    case actions.CHALLENGE_RESPONSE_ACKNOWLEDGED:
      return runningStates.waitForUpdate({
        ...state,
        messageOutbox: challengeComplete(),
        displayOutbox: hideWallet(),
      });
    default:
      return state;
  }
};

const challengeeAcknowledgeChallengeTimeoutReducer = (
  state: states.ChallengeeAcknowledgeChallengeTimeout,
  action: WalletAction,
): WalletState => {
  switch (action.type) {
    case actions.CHALLENGE_TIME_OUT_ACKNOWLEDGED:
      return withdrawalStates.approveWithdrawal({ ...state, messageOutbox: challengeComplete() });
    default:
      return state;
  }
};
