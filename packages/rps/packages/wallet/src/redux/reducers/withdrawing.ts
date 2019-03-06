import * as states from '.././states';
import * as actions from '../actions';
import { unreachable } from '../../utils/reducer-utils';
import { handleSignatureAndValidationMessages } from '../../utils/state-utils';
import { createTransferAndWithdrawTransaction } from '../../utils/transaction-generator';
import { signVerificationData } from '../../utils/signing-utils';
import { closeSuccess, hideWallet } from 'magmo-wallet-client/lib/wallet-events';

export const withdrawingReducer = (state: states.WithdrawingState, action: actions.WalletAction): states.WalletState => {
  // Handle any signature/validation request centrally to avoid duplicating code for each state
  if (action.type === actions.OWN_COMMITMENT_RECEIVED || action.type === actions.OPPONENT_COMMITMENT_RECEIVED) {
    return { ...state, messageOutbox: handleSignatureAndValidationMessages(state, action) };
  }
  switch (state.type) {
    case states.APPROVE_WITHDRAWAL:
      return approveWithdrawalReducer(state, action);
    case states.WAIT_FOR_WITHDRAWAL_INITIATION:
      return waitForWithdrawalInitiationReducer(state, action);
    case states.WAIT_FOR_WITHDRAWAL_CONFIRMATION:
      return waitForWithdrawalConfirmationReducer(state, action);
    case states.ACKNOWLEDGE_WITHDRAWAL_SUCCESS:
      return acknowledgeWithdrawalSuccessReducer(state, action);
    case states.WITHDRAW_TRANSACTION_FAILED:
      return withdrawTransactionFailedReducer(state, action);
    default:
      return unreachable(state);
  }
};

const withdrawTransactionFailedReducer = (state: states.WithdrawTransactionFailed, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const myAddress = state.participants[state.ourIndex];
      const myAmount = state.lastCommitment.commitment.allocation[state.ourIndex];
      // TODO: The sender could of changed since the transaction failed. We'll need to check for the updated address.
      const signature = signVerificationData(myAddress, state.userAddress, myAmount, state.userAddress, state.privateKey);
      const transactionOutbox = createTransferAndWithdrawTransaction(state.adjudicator, state.channelId, myAddress, state.userAddress, myAmount, signature);
      return states.waitForWithdrawalInitiation({ ...state, transactionOutbox });
  }
  return state;
};

const approveWithdrawalReducer = (state: states.ApproveWithdrawal, action: actions.WalletAction): states.WalletState => {
  switch (action.type) {
    case actions.WITHDRAWAL_APPROVED:

      const myAddress = state.participants[state.ourIndex];
      const myAmount = state.lastCommitment.commitment.allocation[state.ourIndex];
      const signature = signVerificationData(myAddress, action.destinationAddress, myAmount, action.destinationAddress, state.privateKey);
      const transactionOutbox = createTransferAndWithdrawTransaction(state.adjudicator, state.channelId, myAddress, action.destinationAddress, myAmount, signature);
      return states.waitForWithdrawalInitiation({ ...state, transactionOutbox, userAddress: action.destinationAddress });
    case actions.WITHDRAWAL_REJECTED:
      return states.acknowledgeCloseSuccess(state);
    default:
      return state;
  }
};

const waitForWithdrawalInitiationReducer = (state: states.WaitForWithdrawalInitiation, action: actions.WalletAction): states.WalletState => {
  switch (action.type) {
    case actions.TRANSACTION_SUBMITTED:
      return states.waitForWithdrawalConfirmation({ ...state, transactionHash: action.transactionHash });
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return states.withdrawTransactionFailed(state);
    default:
      return state;
  }
};

const waitForWithdrawalConfirmationReducer = (state: states.WaitForWithdrawalConfirmation, action: actions.WalletAction): states.WalletState => {
  switch (action.type) {
    case actions.TRANSACTION_CONFIRMED:
      return states.acknowledgeWithdrawalSuccess(state);
    default:
      return state;
  }
};

const acknowledgeWithdrawalSuccessReducer = (state: states.AcknowledgeWithdrawalSuccess, action: actions.WalletAction): states.WalletState => {
  switch (action.type) {
    case actions.WITHDRAWAL_SUCCESS_ACKNOWLEDGED:
      // TODO: We shouldn't be sending out a close success in the withdrawal reducer
      return states.waitForChannel({ ...state, messageOutbox: closeSuccess(), displayOutbox: hideWallet() });
    default:
      return state;
  }
};
