import * as selectors from "../../selectors";
import {
  createConcludePushOutcomeAndTransferAllTransaction as nitroCreateConcludePushOutcomeAndTransferAllTransaction,
  ConcludePushOutcomeAndTransferAllArgs
} from "../../../utils/transaction-generator";
import {
  initialize as initTransactionState,
  transactionReducer
} from "../transaction-submission/reducer";
import {isTransactionAction} from "../transaction-submission/actions";
import {isTerminal, TransactionSubmissionState, isSuccess} from "../transaction-submission/states";
import {unreachable} from "../../../utils/reducer-utils";
import {SharedData} from "../../state";
import {TransactionRequestWithTarget} from "../../outbox/state";
import {ADJUDICATOR_ADDRESS} from "../../../constants";

import {WithdrawalAction} from "./actions";
import * as states from "./states";

import {ProtocolStateWithSharedData} from "..";

export const initialize = (
  withdrawalAmount: string,
  channelId: string,
  processId: string,
  sharedData: SharedData
): ProtocolStateWithSharedData<states.WithdrawalState> => {
  if (!channelIsClosed(channelId, sharedData)) {
    return {
      protocolState: states.failure({reason: states.FailureReason.ChannelNotClosed}),
      sharedData
    };
  }
  return {
    protocolState: states.waitForApproval({withdrawalAmount, processId, channelId}),
    sharedData
  };
};

export const withdrawalReducer = (
  protocolState: states.WithdrawalState,
  sharedData: SharedData,
  action: WithdrawalAction
): ProtocolStateWithSharedData<states.WithdrawalState> => {
  switch (protocolState.type) {
    case "Withdrawing.WaitforApproval":
      return waitForApprovalReducer(protocolState, sharedData, action);
    case "Withdrawing.WaitForTransaction":
      return waitForTransactionReducer(protocolState, sharedData, action);
    case "Withdrawing.WaitForAcknowledgement":
      return waitForAcknowledgementReducer(protocolState, sharedData, action);
    case "Withdrawing.Failure":
    case "Withdrawing.Success":
      return {protocolState, sharedData};
    default:
      return unreachable(protocolState);
  }
};
const waitForAcknowledgementReducer = (
  protocolState: states.WaitForAcknowledgement,
  sharedData: SharedData,
  action: WithdrawalAction
): ProtocolStateWithSharedData<states.WithdrawalState> => {
  if (action.type === "WALLET.WITHDRAWING.WITHDRAWAL_SUCCESS_ACKNOWLEDGED") {
    return {protocolState: states.success({}), sharedData};
  }
  return {protocolState, sharedData};
};
const waitForTransactionReducer = (
  protocolState: states.WaitForTransaction,
  sharedData: SharedData,
  action: WithdrawalAction
): ProtocolStateWithSharedData<states.WithdrawalState> => {
  if (!isTransactionAction(action)) {
    return {sharedData, protocolState};
  }
  const {storage: newSharedData, state: newTransactionState} = transactionReducer(
    protocolState.transactionSubmissionState,
    sharedData,
    action
  );
  if (!isTerminal(newTransactionState)) {
    return {
      sharedData: newSharedData,
      protocolState: {...protocolState, transactionSubmissionState: newTransactionState}
    };
  } else {
    return handleTransactionSubmissionComplete(protocolState, newTransactionState, newSharedData);
  }
};

const waitForApprovalReducer = (
  protocolState: states.WaitForApproval,
  sharedData: SharedData,
  action: WithdrawalAction
): ProtocolStateWithSharedData<states.WithdrawalState> => {
  switch (action.type) {
    case "WALLET.WITHDRAWING.WITHDRAWAL_APPROVED":
      const {
        channelId,
        // @ts-ignore
        withdrawalAmount,
        processId
      } = protocolState;
      const {withdrawalAddress} = action;
      console.warn("The withdrawalAmount parameter is currently ignored");
      const transaction = createConcludePushOutcomeAndTransferAllTransaction(channelId, sharedData);
      const {storage: newSharedData, state: transactionSubmissionState} = initTransactionState(
        transaction,
        processId,
        channelId,
        sharedData
      );

      return {
        protocolState: states.waitForTransaction({
          ...protocolState,
          withdrawalAddress,
          transactionSubmissionState
        }),
        sharedData: newSharedData
      };
    case "WALLET.WITHDRAWING.WITHDRAWAL_REJECTED":
      return {
        protocolState: states.failure({reason: states.FailureReason.UserRejected}),
        sharedData
      };
    default:
      return {protocolState, sharedData};
  }
};

const handleTransactionSubmissionComplete = (
  protocolState: states.WaitForTransaction,
  transactionState: TransactionSubmissionState,
  sharedData: SharedData
) => {
  if (isSuccess(transactionState)) {
    return {
      protocolState: states.waitForAcknowledgement(protocolState),
      sharedData
    };
  } else {
    return {
      protocolState: states.failure({reason: states.FailureReason.TransactionFailure}),
      sharedData
    };
  }
};

const channelIsClosed = (channelId: string, sharedData: SharedData): boolean => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);
  const [lastState, penultimateState] = channelState.signedStates;
  return lastState.state.isFinal && penultimateState.state.isFinal;
  // TODO: Check if there is a finalized outcome on chain
};

const createConcludePushOutcomeAndTransferAllTransaction = (
  channelId: string,
  sharedData: SharedData
): TransactionRequestWithTarget => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);
  const {signedStates: lastRound} = channelState;
  const [penultimateState, lastState] = lastRound;

  const args: ConcludePushOutcomeAndTransferAllArgs = {
    fromSignedState: penultimateState,
    toSignedState: lastState
  };
  return {
    ...nitroCreateConcludePushOutcomeAndTransferAllTransaction(args),
    to: ADJUDICATOR_ADDRESS
  };
};
