import { Commitment } from '../../../domain';
import { ProtocolStateWithSharedData } from '..';
import * as states from './state';
import * as actions from './actions';
import { unreachable } from '../../../utils/reducer-utils';
import * as selectors from '../../selectors';
import * as TransactionGenerator from '../../../utils/transaction-generator';
import { PlayerIndex } from '../../types';
import { TransactionRequest } from 'ethers/providers';
import {
  initialize as initTransactionState,
  transactionReducer,
} from '../transaction-submission/reducer';
import { SharedData } from '../../state';
import * as SigningUtils from '../../../domain';
import { isTransactionAction } from '../transaction-submission/actions';
import {
  isTerminal,
  TransactionSubmissionState,
  isSuccess,
} from '../transaction-submission/states';
import { channelID } from 'fmg-core/lib/channel';

export const initialize = (
  processId: string,
  sharedData: SharedData,
  challengeCommitment: Commitment,
): ProtocolStateWithSharedData<states.RespondingState> => {
  return {
    protocolState: states.waitForApproval({ processId, challengeCommitment }),
    sharedData,
  };
};

export const respondingReducer = (
  protocolState: states.RespondingState,
  sharedData: SharedData,
  action: actions.RespondingAction,
): ProtocolStateWithSharedData<states.RespondingState> => {
  switch (protocolState.type) {
    case states.WAIT_FOR_APPROVAL:
      return waitForApprovalReducer(protocolState, sharedData, action);
    case states.WAIT_FOR_ACKNOWLEDGEMENT:
      return waitForAcknowledgementReducer(protocolState, sharedData, action);
    case states.WAIT_FOR_RESPONSE:
      return waitForResponseReducer(protocolState, sharedData, action);
    case states.WAIT_FOR_TRANSACTION:
      return waitForTransactionReducer(protocolState, sharedData, action);
    case states.SUCCESS:
    case states.FAILURE:
      return { protocolState, sharedData };
    default:
      return unreachable(protocolState);
  }
};

const waitForTransactionReducer = (
  protocolState: states.WaitForTransaction,
  sharedData: SharedData,
  action: actions.RespondingAction,
): ProtocolStateWithSharedData<states.RespondingState> => {
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
const waitForResponseReducer = (
  protocolState: states.WaitForResponse,
  sharedData: SharedData,
  action: actions.RespondingAction,
): ProtocolStateWithSharedData<states.RespondingState> => {
  switch (action.type) {
    case actions.RESPONSE_PROVIDED:
      const { commitment } = action;
      const signature = signCommitment(commitment, sharedData);
      const transaction = TransactionGenerator.createRespondWithMoveTransaction(
        commitment,
        signature,
      );
      return transitionToWaitForTransaction(transaction, protocolState, sharedData);
    default:
      return { protocolState, sharedData };
  }
};

const waitForAcknowledgementReducer = (
  protocolState: states.WaitForAcknowledgement,
  sharedData: SharedData,
  action: actions.RespondingAction,
): ProtocolStateWithSharedData<states.RespondingState> => {
  switch (action.type) {
    case actions.RESPOND_SUCCESS_ACKNOWLEDGED:
      return {
        protocolState: states.success(),
        sharedData,
      };
    default:
      return { protocolState, sharedData };
  }
};

const waitForApprovalReducer = (
  protocolState: states.WaitForApproval,
  sharedData: SharedData,
  action: actions.RespondingAction,
): ProtocolStateWithSharedData<states.RespondingState> => {
  switch (action.type) {
    case actions.RESPOND_APPROVED:
      const { challengeCommitment, processId } = protocolState;
      if (!canRespondWithExistingCommitment(protocolState.challengeCommitment, sharedData)) {
        return {
          protocolState: states.waitForResponse(protocolState),
          sharedData,
        };
      } else {
        const transaction = craftResponseTransactionWithExistingCommitment(
          processId,
          challengeCommitment,
          sharedData,
        );

        return transitionToWaitForTransaction(transaction, protocolState, sharedData);
      }
    case actions.RESPOND_REJECTED:
      return {
        protocolState: states.failure(states.FailureReason.UserRejected),
        sharedData,
      };
    default:
      return { protocolState, sharedData };
  }
};

// helpers
const handleTransactionSubmissionComplete = (
  protocolState: states.WaitForTransaction,
  transactionState: TransactionSubmissionState,
  sharedData: SharedData,
) => {
  if (isSuccess(transactionState)) {
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

const transitionToWaitForTransaction = (
  transaction: TransactionRequest,
  protocolState: states.WaitForResponse | states.WaitForApproval,
  sharedData: SharedData,
) => {
  const { processId } = protocolState;
  const { storage: newSharedData, state: transactionSubmissionState } = initTransactionState(
    transaction,
    processId,
    sharedData,
  );
  const newProtocolState = states.waitForTransaction({
    ...protocolState,
    transactionSubmissionState,
  });
  return {
    protocolState: newProtocolState,
    sharedData: newSharedData,
  };
};

// TODO: Should we just expect a signature on the action?
const signCommitment = (commitment: Commitment, sharedData: SharedData): string => {
  const channelId = channelID(commitment.channel);
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);
  return SigningUtils.signCommitment(commitment, channelState.privateKey);
};

const craftResponseTransactionWithExistingCommitment = (
  processId: string,
  challengeCommitment: Commitment,
  sharedData: SharedData,
): TransactionRequest => {
  const {
    penultimateCommitment,
    lastCommitment,
    lastSignature,
    penultimateSignature,
  } = getStoredCommitments(challengeCommitment, sharedData);

  if (canRefute(challengeCommitment, sharedData)) {
    if (canRefuteWithCommitment(lastCommitment, challengeCommitment)) {
      return TransactionGenerator.createRefuteTransaction(lastCommitment, lastSignature);
    } else {
      return TransactionGenerator.createRefuteTransaction(
        penultimateCommitment,
        penultimateSignature,
      );
    }
  } else if (canRespondWithExistingCommitment(challengeCommitment, sharedData)) {
    return TransactionGenerator.createRespondWithMoveTransaction(lastCommitment, lastSignature);
  } else {
    // TODO: We should never actually hit this, currently a sanity check to help out debugging
    throw new Error('Cannot refute or respond with existing commitment.');
  }
};

const getStoredCommitments = (
  challengeCommitment: Commitment,
  sharedData: SharedData,
): {
  lastCommitment: Commitment;
  penultimateCommitment: Commitment;
  lastSignature: string;
  penultimateSignature: string;
} => {
  const channelId = channelID(challengeCommitment.channel);
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);
  const lastCommitment = channelState.lastCommitment.commitment;
  const penultimateCommitment = channelState.penultimateCommitment.commitment;
  const lastSignature = channelState.lastCommitment.signature;
  const penultimateSignature = channelState.penultimateCommitment.signature;
  return { lastCommitment, penultimateCommitment, lastSignature, penultimateSignature };
};

const canRespondWithExistingCommitment = (
  challengeCommitment: Commitment,
  sharedData: SharedData,
) => {
  return (
    canRespondWithExistingMove(challengeCommitment, sharedData) ||
    canRefute(challengeCommitment, sharedData)
  );
};
const canRespondWithExistingMove = (
  challengeCommitment: Commitment,
  sharedData: SharedData,
): boolean => {
  const { penultimateCommitment, lastCommitment } = getStoredCommitments(
    challengeCommitment,
    sharedData,
  );
  return (
    penultimateCommitment === challengeCommitment &&
    mover(lastCommitment) !== mover(challengeCommitment)
  );
};

const canRefute = (challengeCommitment: Commitment, sharedData: SharedData) => {
  const { penultimateCommitment, lastCommitment } = getStoredCommitments(
    challengeCommitment,
    sharedData,
  );
  return (
    canRefuteWithCommitment(lastCommitment, challengeCommitment) ||
    canRefuteWithCommitment(penultimateCommitment, challengeCommitment)
  );
};

const canRefuteWithCommitment = (commitment: Commitment, challengeCommitment: Commitment) => {
  return (
    commitment.turnNum > challengeCommitment.turnNum &&
    mover(commitment) === mover(challengeCommitment)
  );
};

const mover = (commitment: Commitment): PlayerIndex => {
  return commitment.turnNum % 2;
};
