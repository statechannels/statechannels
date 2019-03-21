import * as channelStates from '../state';
import * as actions from '../../actions';

import { WalletAction } from '../../actions';
import { unreachable, ourTurn, validTransition } from '../../../utils/reducer-utils';
import {
  signCommitment,
  signVerificationData,
  validCommitmentSignature,
} from '../../../utils/signing-utils';
import {
  commitmentRelayRequested,
  closeSuccess,
  concludeSuccess,
  concludeFailure,
  hideWallet,
} from 'magmo-wallet-client/lib/wallet-events';
import { CommitmentType, Commitment } from 'fmg-core';
import {
  createConcludeAndWithdrawTransaction,
  ConcludeAndWithdrawArgs,
} from '../../../utils/transaction-generator';
import { StateWithSideEffects } from '../../shared/state';

export const closingReducer = (
  state: channelStates.ClosingState,
  action: WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  // TODO: Clear funding status.
  switch (state.type) {
    case channelStates.APPROVE_CONCLUDE:
      return approveConcludeReducer(state, action);
    case channelStates.WAIT_FOR_OPPONENT_CONCLUDE:
      return waitForOpponentConclude(state, action);
    case channelStates.APPROVE_CLOSE_ON_CHAIN:
      return approveCloseOnChainReducer(state, action);
    case channelStates.ACKNOWLEDGE_CLOSE_SUCCESS:
      return acknowledgeCloseSuccessReducer(state, action);
    case channelStates.ACKNOWLEDGE_CLOSED_ON_CHAIN:
      return acknowledgeClosedOnChainReducer(state, action);
    case channelStates.WAIT_FOR_CLOSE_INITIATION:
      return waitForCloseInitiatorReducer(state, action);
    case channelStates.WAIT_FOR_CLOSE_SUBMISSION:
      return waitForCloseSubmissionReducer(state, action);
    case channelStates.WAIT_FOR_CLOSE_CONFIRMED:
      return waitForCloseConfirmedReducer(state, action);
    case channelStates.ACKNOWLEDGE_CONCLUDE:
      return acknowledgeConcludeReducer(state, action);
    case channelStates.CLOSE_TRANSACTION_FAILED:
      return closeTransactionFailedReducer(state, action);
    default:
      return unreachable(state);
  }
};

const closeTransactionFailedReducer = (
  state: channelStates.CloseTransactionFailed,
  action: actions.WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const { penultimateCommitment: from, lastCommitment: to } = state;
      const myAddress = state.participants[state.ourIndex];
      const amount = to.commitment.allocation[state.ourIndex];
      // TODO: The sender could of changed since the transaction failed. We'll need to check for the updated address.
      const verificationSignature = signVerificationData(
        myAddress,
        state.userAddress,
        amount,
        state.userAddress,
        state.privateKey,
      );
      const args: ConcludeAndWithdrawArgs = {
        fromCommitment: from.commitment,
        toCommitment: to.commitment,
        fromSignature: from.signature,
        toSignature: to.signature,
        verificationSignature,
        amount,
        participant: myAddress,
        destination: state.userAddress,
      };
      const transactionOutbox = createConcludeAndWithdrawTransaction(args);
      return {
        state: channelStates.waitForCloseSubmission({ ...state }),
        outboxState: { transactionOutbox },
      };
  }
  return { state };
};

const acknowledgeConcludeReducer = (
  state: channelStates.AcknowledgeConclude,
  action: actions.WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  switch (action.type) {
    case actions.CONCLUDE_APPROVED:
      if (!ourTurn(state)) {
        return {
          state,
          outboxState: {
            displayOutbox: hideWallet(),
            messageOutbox: concludeFailure('Other', "It is not the current user's turn"),
          },
        };
      }
      const {
        positionSignature,
        sendCommitmentAction,
        concludeCommitment,
      } = composeConcludePosition(state);
      const lastState = state.lastCommitment.commitment;
      if (lastState.commitmentType === CommitmentType.Conclude) {
        return {
          state: channelStates.approveCloseOnChain({
            ...state,
            turnNum: concludeCommitment.turnNum,
            penultimateCommitment: state.lastCommitment,
            lastCommitment: { commitment: concludeCommitment, signature: positionSignature },
          }),
          outboxState: { messageOutbox: sendCommitmentAction },
        };
      }
  }
  return { state };
};

const waitForCloseConfirmedReducer = (
  state: channelStates.WaitForCloseConfirmed,
  action: actions.WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  switch (action.type) {
    case actions.TRANSACTION_CONFIRMED:
      return {
        state: channelStates.acknowledgeCloseSuccess({ ...state }),
        outboxState: { messageOutbox: closeSuccess() },
      };
  }
  return { state };
};

const waitForCloseInitiatorReducer = (
  state: channelStates.WaitForCloseInitiation,
  action: actions.WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return { state: channelStates.waitForCloseSubmission(state) };
  }
  return { state };
};

const waitForCloseSubmissionReducer = (
  state: channelStates.WaitForCloseSubmission,
  action: actions.WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  switch (action.type) {
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return { state: channelStates.closeTransactionFailed(state) };
    case actions.TRANSACTION_SUBMITTED:
      return {
        state: channelStates.waitForCloseConfirmed({
          ...state,
          transactionHash: action.transactionHash,
        }),
      };
  }
  return { state };
};

const approveCloseOnChainReducer = (
  state: channelStates.ApproveCloseOnChain,
  action: actions.WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  switch (action.type) {
    case actions.APPROVE_CLOSE:
      const { penultimateCommitment: from, lastCommitment: to } = state;
      const myAddress = state.participants[state.ourIndex];
      const amount = to.commitment.allocation[state.ourIndex];
      // TODO: The sender could of changed since the transaction failed. We'll need to check for the updated address.
      const verificationSignature = signVerificationData(
        myAddress,
        action.withdrawAddress,
        amount,
        action.withdrawAddress,
        state.privateKey,
      );
      const args: ConcludeAndWithdrawArgs = {
        fromCommitment: from.commitment,
        toCommitment: to.commitment,
        fromSignature: from.signature,
        toSignature: to.signature,
        verificationSignature,
        amount,
        participant: myAddress,
        destination: action.withdrawAddress,
      };
      const transactionOutbox = createConcludeAndWithdrawTransaction(args);
      return {
        state: channelStates.waitForCloseInitiation({
          ...state,
          userAddress: action.withdrawAddress,
        }),
        outboxState: { transactionOutbox },
      };
  }
  return { state };
};

const approveConcludeReducer = (
  state: channelStates.ApproveConclude,
  action: WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  switch (action.type) {
    case actions.CONCLUDE_APPROVED:
      if (!ourTurn(state)) {
        return {
          state,
          outboxState: {
            displayOutbox: hideWallet(),
            messageOutbox: concludeFailure('Other', "It is not the current user's turn"),
          },
        };
      }

      const {
        concludeCommitment,
        positionSignature,
        sendCommitmentAction,
      } = composeConcludePosition(state);
      const { lastCommitment } = state;
      if (lastCommitment.commitment.commitmentType === CommitmentType.Conclude) {
        return {
          state: channelStates.approveCloseOnChain({
            ...state,
            turnNum: concludeCommitment.turnNum,
            penultimateCommitment: state.lastCommitment,
            lastCommitment: { commitment: concludeCommitment, signature: positionSignature },
          }),
          outboxState: { messageOutbox: sendCommitmentAction },
        };
      } else {
        return {
          state: channelStates.waitForOpponentConclude({
            ...state,
            turnNum: concludeCommitment.turnNum,
            penultimateCommitment: state.lastCommitment,
            lastCommitment: { commitment: concludeCommitment, signature: positionSignature },
          }),
          outboxState: { messageOutbox: sendCommitmentAction },
        };
      }
      break;
    case actions.CONCLUDE_REJECTED:
      return {
        state: channelStates.waitForUpdate({
          ...state,
        }),
        outboxState: {
          displayOutbox: hideWallet(),
          messageOutbox: concludeFailure('UserDeclined'),
        },
      };
    default:
      return { state };
  }
};

const waitForOpponentConclude = (
  state: channelStates.WaitForOpponentConclude,
  action: WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const { commitment, signature } = action;

      const opponentAddress = state.participants[1 - state.ourIndex];
      if (!validCommitmentSignature(commitment, signature, opponentAddress)) {
        return {
          state,
          outboxState: {
            displayOutbox: hideWallet(),
            messageOutbox: concludeFailure('Other', 'The signature provided is not valid.'),
          },
        };
      }
      if (!validTransition(state, commitment)) {
        return {
          state,
          outboxState: {
            displayOutbox: hideWallet(),
            messageOutbox: concludeFailure(
              'Other',
              `The transition from ${state.type} to conclude is not valid.`,
            ),
          },
        };
      }
      return {
        state: channelStates.approveCloseOnChain({
          ...state,
          turnNum: commitment.turnNum,
          penultimateCommitment: state.lastCommitment,
          lastCommitment: { commitment, signature },
        }),
        outboxState: { messageOutbox: concludeSuccess() },
      };
    default:
      return { state };
  }
};

const acknowledgeCloseSuccessReducer = (
  state: channelStates.AcknowledgeCloseSuccess,
  action: WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  switch (action.type) {
    case actions.CLOSE_SUCCESS_ACKNOWLEDGED:
      return {
        state: channelStates.waitForChannel({
          ...state,
        }),
        outboxState: { messageOutbox: closeSuccess(), displayOutbox: hideWallet() },
      };
    default:
      return { state };
  }
};

const acknowledgeClosedOnChainReducer = (
  state: channelStates.AcknowledgeClosedOnChain,
  action: WalletAction,
): StateWithSideEffects<channelStates.ChannelState> => {
  switch (action.type) {
    case actions.CLOSED_ON_CHAIN_ACKNOWLEDGED:
      return {
        state: channelStates.waitForChannel({ ...state }),
        outboxState: { messageOutbox: closeSuccess() },
      };
    default:
      return { state };
  }
};

const composeConcludePosition = (state: channelStates.ClosingState) => {
  const commitmentCount =
    state.lastCommitment.commitment.commitmentType === CommitmentType.Conclude ? 1 : 0;
  const concludeCommitment: Commitment = {
    ...state.lastCommitment.commitment,
    commitmentType: CommitmentType.Conclude,
    turnNum: state.turnNum + 1,
    commitmentCount,
  };

  const commitmentSignature = signCommitment(concludeCommitment, state.privateKey);
  const sendCommitmentAction = commitmentRelayRequested(
    state.participants[1 - state.ourIndex],
    concludeCommitment,
    commitmentSignature,
  );
  return { concludeCommitment, positionSignature: commitmentSignature, sendCommitmentAction };
};
