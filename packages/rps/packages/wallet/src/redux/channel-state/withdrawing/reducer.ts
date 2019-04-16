import * as states from '../state';
import * as actions from '../../actions';
import { unreachable } from '../../../utils/reducer-utils';
import { handleSignatureAndValidationMessages } from '../../../utils/state-utils';
import { createTransferAndWithdrawTransaction } from '../../../utils/transaction-generator';
import { signVerificationData } from '../../../utils/signing-utils';
import { closeSuccess, hideWallet } from 'magmo-wallet-client/lib/wallet-events';
import { StateWithSideEffects } from '../../utils';

export const withdrawingReducer = (
  state: states.WithdrawingState,
  action: actions.WalletAction,
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

const withdrawTransactionFailedReducer = (
  state: states.WithdrawTransactionFailed,
  action: actions.WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.TRANSACTION_RETRY_APPROVED:
      const myAddress = state.participants[state.ourIndex];
      const myAmount = state.lastCommitment.commitment.allocation[state.ourIndex];
      // TODO: The sender could of changed since the transaction failed. We'll need to check for the updated address.
      const signature = signVerificationData(
        myAddress,
        state.userAddress,
        myAmount,
        state.userAddress,
        state.privateKey,
      );
      const transactionRequest = createTransferAndWithdrawTransaction(
        state.channelId,
        myAddress,
        state.userAddress,
        myAmount,
        signature,
      );
      return {
        state: states.waitForWithdrawalInitiation({ ...state }),
        // TODO: This will be factored out as channel reducers should not be sending transactions itself
        sideEffects: {
          transactionOutbox: {
            transactionRequest,
            processId: `withdrawing.${state.channelId}`,
          },
        },
      };
  }
  return { state };
};

const approveWithdrawalReducer = (
  state: states.ApproveWithdrawal,
  action: actions.WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.channel.WITHDRAWAL_APPROVED:
      const myAddress = state.participants[state.ourIndex];
      const myAmount = state.lastCommitment.commitment.allocation[state.ourIndex];
      const signature = signVerificationData(
        myAddress,
        action.destinationAddress,
        myAmount,
        action.destinationAddress,
        state.privateKey,
      );
      const transactionRequest = createTransferAndWithdrawTransaction(
        state.channelId,
        myAddress,
        action.destinationAddress,
        myAmount,
        signature,
      );
      return {
        state: states.waitForWithdrawalInitiation({
          ...state,
          userAddress: action.destinationAddress,
        }),
        // TODO: This will be factored out as channel reducers should not be sending transactions itself
        sideEffects: {
          transactionOutbox: {
            transactionRequest,
            processId: `withdrawing.${state.channelId}`,
          },
        },
      };
    case actions.channel.WITHDRAWAL_REJECTED:
      return { state: states.acknowledgeCloseSuccess(state) };
    default:
      return { state };
  }
};

const waitForWithdrawalInitiationReducer = (
  state: states.WaitForWithdrawalInitiation,
  action: actions.WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.TRANSACTION_SUBMITTED:
      return {
        state: states.waitForWithdrawalConfirmation({
          ...state,
          transactionHash: action.transactionHash,
        }),
      };
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { state: states.withdrawTransactionFailed(state) };
    default:
      return { state };
  }
};

const waitForWithdrawalConfirmationReducer = (
  state: states.WaitForWithdrawalConfirmation,
  action: actions.WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.TRANSACTION_CONFIRMED:
      return { state: states.acknowledgeWithdrawalSuccess(state) };
    default:
      return { state };
  }
};

const acknowledgeWithdrawalSuccessReducer = (
  state: states.AcknowledgeWithdrawalSuccess,
  action: actions.WalletAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.channel.WITHDRAWAL_SUCCESS_ACKNOWLEDGED:
      // TODO: We shouldn't be sending out a close success in the withdrawal reducer
      return {
        state: states.finalized({
          ...state,
        }),
        sideEffects: { messageOutbox: closeSuccess(), displayOutbox: hideWallet() },
      };
    default:
      return { state };
  }
};
