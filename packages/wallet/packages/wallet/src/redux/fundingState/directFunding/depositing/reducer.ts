import { unreachable } from '../../../../utils/reducer-utils';
import { createDepositTransaction } from '../../../../utils/transaction-generator';
import { StateWithSideEffects } from '../../../shared/state';

import * as actions from '../../../actions';
import * as states from './state';
import * as fundingStates from '../state';

export const depositingReducer = (
  state: states.Depositing,
  action: actions.WalletAction,
): StateWithSideEffects<fundingStates.DirectFundingState> => {
  switch (state.depositStatus) {
    case states.WAIT_FOR_TRANSACTION_SENT:
      return waitForTransactionSentReducer(state, action);
    case states.WAIT_FOR_DEPOSIT_APPROVAL:
      return waitForDepositApprovalReducer(state, action);
    case states.WAIT_FOR_DEPOSIT_CONFIRMATION:
      return waitForDepositConfirmationReducer(state, action);
    case states.DEPOSIT_TRANSACTION_FAILED:
      return depositTransactionFailedReducer(state, action);
  }
  return unreachable(state);
};

const waitForTransactionSentReducer = (
  state: states.WaitForTransactionSent,
  action: actions.WalletAction,
): StateWithSideEffects<states.Depositing> => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return {
        state: states.waitForDepositApproval(state),
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { state: states.depositTransactionFailed(state) };
    default:
      return { state };
  }
};

const waitForDepositApprovalReducer = (
  state: states.WaitForDepositApproval,
  action: actions.WalletAction,
): StateWithSideEffects<states.Depositing> => {
  switch (action.type) {
    case actions.TRANSACTION_SUBMITTED:
      return {
        state: states.waitForDepositConfirmation({
          ...state,
          transactionHash: action.transactionHash,
        }),
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { state: states.depositTransactionFailed(state) };
    default:
      return { state };
  }
};

const waitForDepositConfirmationReducer = (
  state: states.WaitForDepositConfirmation,
  action: actions.WalletAction,
): StateWithSideEffects<fundingStates.DirectFundingState> => {
  switch (action.type) {
    case actions.TRANSACTION_CONFIRMED:
      return { state: fundingStates.waitForFundingConfirmed(state) };
    default:
      return { state };
  }
};

const depositTransactionFailedReducer = (
  state: states.DepositTransactionFailed,
  action: actions.WalletAction,
): StateWithSideEffects<states.Depositing> => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      return {
        state: states.waitForTransactionSent({
          ...state,
        }),
        outboxState: {
          transactionOutbox: createDepositTransaction(
            state.channelId,
            state.requestedYourContribution,
          ),
        },
      };
  }
  return { state };
};
