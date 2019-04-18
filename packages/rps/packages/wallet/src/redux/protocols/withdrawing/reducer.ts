import { SharedData, ProtocolStateWithSharedData } from '..';
import * as states from './states';
import * as actions from './actions';
import { WithdrawalAction } from './actions';
import * as selectors from '../../selectors';
import { CommitmentType } from 'fmg-core/lib/commitment';
import {
  createConcludeAndWithdrawTransaction,
  ConcludeAndWithdrawArgs,
} from '../../../utils/transaction-generator';
import { signVerificationData } from '../../../utils/signing-utils';
import { TransactionRequest } from 'ethers/providers';
import {
  initialize as initTransactionState,
  transactionReducer,
} from '../transaction-submission/reducer';
import { isTransactionAction } from '../transaction-submission/actions';
import { SUCCESS, isTerminal, TransactionSubmissionState } from '../transaction-submission/states';
import { unreachable } from '../../../utils/reducer-utils';

export const initialize = (
  withdrawalAmount: string,
  channelId: string,
  processId: string,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.WithdrawalState> => {
  if (!channelIsClosed(channelId, sharedData)) {
    return {
      protocolState: states.failure(states.FailureReason.ChannelNotClosed),
      sharedData,
    };
  }
  return {
    protocolState: states.waitForApproval({ withdrawalAmount, processId, channelId }),
    sharedData,
  };
};

export const withdrawalReducer = (
  protocolState: states.WithdrawalState,
  sharedData: SharedData,
  action: WithdrawalAction,
): ProtocolStateWithSharedData<states.WithdrawalState> => {
  switch (protocolState.type) {
    case states.WAIT_FOR_APPROVAL:
      return waitForApprovalReducer(protocolState, sharedData, action);
    case states.WAIT_FOR_TRANSACTION:
      return waitForTransactionReducer(protocolState, sharedData, action);
    case states.WAIT_FOR_ACKNOWLEDGEMENT:
      return waitForAcknowledgementReducer(protocolState, sharedData, action);
    case states.FAILURE:
    case states.SUCCESS:
      return { protocolState, sharedData };
    default:
      return unreachable(protocolState);
  }
};
const waitForAcknowledgementReducer = (
  protocolState: states.WaitForAcknowledgement,
  sharedData: SharedData,
  action: WithdrawalAction,
): ProtocolStateWithSharedData<states.WithdrawalState> => {
  if (action.type === actions.WITHDRAWAL_SUCCESS_ACKNOWLEDGED) {
    return { protocolState: states.success(), sharedData };
  }
  return { protocolState, sharedData };
};
const waitForTransactionReducer = (
  protocolState: states.WaitForTransaction,
  sharedData: SharedData,
  action: WithdrawalAction,
): ProtocolStateWithSharedData<states.WithdrawalState> => {
  if (!isTransactionAction(action)) {
    return { sharedData, protocolState };
  }
  const { storage: newSharedData, state: newTransactionState } = transactionReducer(
    protocolState.transactionSubmissionState,
    sharedData,
    action,
  );
  if (!isTerminal(newTransactionState)) {
    return {
      sharedData: newSharedData,
      protocolState: { ...protocolState, transactionSubmissionState: newTransactionState },
    };
  } else {
    return handleTransactionSubmissionComplete(protocolState, newTransactionState, newSharedData);
  }
};

const waitForApprovalReducer = (
  protocolState: states.WaitForApproval,
  sharedData: SharedData,
  action: WithdrawalAction,
): ProtocolStateWithSharedData<states.WithdrawalState> => {
  switch (action.type) {
    case actions.WITHDRAWAL_APPROVED:
      const { channelId, withdrawalAmount, processId } = protocolState;
      const { withdrawalAddress } = action;
      const transaction = createConcludeAndWithTransaction(
        channelId,
        withdrawalAmount,
        withdrawalAddress,
        sharedData,
      );
      const { storage: newSharedData, state: transactionSubmissionState } = initTransactionState(
        transaction,
        processId,
        sharedData,
      );

      return {
        protocolState: states.waitForTransaction({
          ...protocolState,
          withdrawalAddress,
          transactionSubmissionState,
        }),
        sharedData: newSharedData,
      };
    case actions.WITHDRAWAL_REJECTED:
      return {
        protocolState: states.failure(states.FailureReason.UserRejected),
        sharedData,
      };
    default:
      return { protocolState, sharedData };
  }
};

const handleTransactionSubmissionComplete = (
  protocolState: states.WaitForTransaction,
  transactionState: TransactionSubmissionState,
  sharedData: SharedData,
) => {
  if (transactionState.type === SUCCESS) {
    return {
      protocolState: states.waitForAcknowledgement(protocolState),
      sharedData,
    };
  } else {
    return {
      protocolState: states.failure(states.FailureReason.TransactionFailure),
      sharedData,
    };
  }
};

const channelIsClosed = (channelId: string, sharedData: SharedData): boolean => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);
  const { lastCommitment, penultimateCommitment } = channelState;
  return (
    lastCommitment.commitment.commitmentType === CommitmentType.Conclude &&
    penultimateCommitment.commitment.commitmentType === CommitmentType.Conclude
  );
  // TODO: Check if there is a finalized outcome on chain
};

const createConcludeAndWithTransaction = (
  channelId: string,
  withdrawalAmount: string,
  withdrawalAddress: string,
  sharedData: SharedData,
): TransactionRequest => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);
  const {
    lastCommitment,
    penultimateCommitment,
    participants,
    ourIndex,
    privateKey,
  } = channelState;
  const participant = participants[ourIndex];
  const verificationSignature = signVerificationData(
    participant,
    withdrawalAddress,
    withdrawalAmount,
    withdrawalAddress,
    privateKey,
  );
  const args: ConcludeAndWithdrawArgs = {
    fromCommitment: penultimateCommitment.commitment,
    fromSignature: penultimateCommitment.signature,
    toCommitment: lastCommitment.commitment,
    toSignature: lastCommitment.signature,
    participant,
    amount: withdrawalAmount,
    destination: withdrawalAddress,
    verificationSignature,
  };
  return createConcludeAndWithdrawTransaction(args);
};
