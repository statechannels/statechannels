import { SharedData, queueMessage, registerChannelToMonitor } from '../../state';
import * as states from './states';
import * as actions from './actions';
import { ProtocolStateWithSharedData } from '..';
import { unreachable } from '../../../utils/reducer-utils';
import {
  validationSuccess,
  signatureSuccess,
  signatureFailure,
  validationFailure,
} from 'magmo-wallet-client';
import {
  checkAndStore,
  checkAndInitialize,
  signAndInitialize,
  signAndStore,
} from '../../channel-store/reducer';
import { Commitment } from '../../../domain';
import { ProtocolAction } from '../../actions';
import * as dispute from '../dispute';
import { disputeReducer } from '../dispute/reducer';

// TODO: Right now we're using a fixed application ID
// since we're not too concerned with handling multiple running app channels.
// This might need to change in the future.
export const APPLICATION_PROCESS_ID = 'Application';

export function initialize(
  sharedData: SharedData,
  channelId: string,
  address: string,
  privateKey: string,
): ProtocolStateWithSharedData<states.ApplicationState> {
  return {
    protocolState: states.waitForFirstCommitment({ channelId, privateKey, address }),
    sharedData: registerChannelToMonitor(sharedData, APPLICATION_PROCESS_ID, channelId, []),
  };
}

export function applicationReducer(
  protocolState: states.ApplicationState,
  sharedData: SharedData,
  action: ProtocolAction,
): ProtocolStateWithSharedData<states.ApplicationState> {
  if (states.isTerminal(protocolState)) {
    return { protocolState, sharedData };
  }
  if (!actions.isApplicationAction(action)) {
    return { protocolState, sharedData };
  }
  if (dispute.isDisputeAction(action)) {
    return handleDisputeAction(protocolState, sharedData, action);
  }
  switch (action.type) {
    case 'WALLET.APPLICATION.OPPONENT_COMMITMENT_RECEIVED':
      return opponentCommitmentReceivedReducer(protocolState, sharedData, action);
    case 'WALLET.APPLICATION.OWN_COMMITMENT_RECEIVED':
      return ownCommitmentReceivedReducer(protocolState, sharedData, action);
    case 'WALLET.APPLICATION.CONCLUDED':
      return { sharedData, protocolState: states.success({}) };
    case 'WALLET.APPLICATION.CHALLENGE_DETECTED':
      return challengeDetectedReducer(protocolState, sharedData, action);
    case 'WALLET.APPLICATION.CHALLENGE_REQUESTED':
      return challengeRequestedReducer(protocolState, sharedData, action);
    default:
      return unreachable(action);
  }
}

function ownCommitmentReceivedReducer(
  protocolState: states.NonTerminalApplicationState,
  sharedData: SharedData,
  action: actions.OwnCommitmentReceived,
): ProtocolStateWithSharedData<states.ApplicationState> {
  const signResult = signAndUpdate(action.commitment, protocolState, sharedData);
  if (!signResult.isSuccess) {
    return {
      sharedData: queueMessage(sharedData, signatureFailure('Other', signResult.reason)),
      protocolState,
    };
  } else {
    const updatedSharedData = { ...sharedData, channelStore: signResult.store };
    return {
      sharedData: queueMessage(
        updatedSharedData,
        signatureSuccess(signResult.signedCommitment.signature),
      ),
      protocolState: states.ongoing(protocolState),
    };
  }
}

function opponentCommitmentReceivedReducer(
  protocolState: states.NonTerminalApplicationState,
  sharedData: SharedData,
  action: actions.OpponentCommitmentReceived,
): ProtocolStateWithSharedData<states.ApplicationState> {
  const { commitment, signature } = action;
  const validateResult = validateAndUpdate(commitment, signature, protocolState, sharedData);
  if (!validateResult.isSuccess) {
    // TODO: Currently checkAndStore doesn't contain any validation messages
    // We might want to return a more descriptive message to the app?
    return {
      sharedData: queueMessage(sharedData, validationFailure('InvalidSignature')),
      protocolState,
    };
  } else {
    const updatedSharedData = { ...sharedData, channelStore: validateResult.store };
    return {
      sharedData: queueMessage(updatedSharedData, validationSuccess()),
      protocolState: states.ongoing(protocolState),
    };
  }
}

function challengeRequestedReducer(
  protocolState: states.NonTerminalApplicationState,
  sharedData: SharedData,
  action: actions.ChallengeRequested,
): ProtocolStateWithSharedData<states.ApplicationState> {
  const { channelId, processId } = action;
  const disputeState = dispute.initializeChallenger(channelId, processId, sharedData);
  const newProtocolState = states.waitForDispute({
    ...protocolState,
    disputeState: disputeState.state,
  });
  return {
    protocolState: newProtocolState,
    sharedData: { ...disputeState.sharedData, currentProcessId: APPLICATION_PROCESS_ID },
  };
}

function challengeDetectedReducer(
  protocolState: states.NonTerminalApplicationState,
  sharedData: SharedData,
  action: actions.ChallengeDetected,
): ProtocolStateWithSharedData<states.ApplicationState> {
  const { channelId, processId, expiresAt: expiryTime, commitment } = action;
  const disputeState = dispute.initializeResponder(
    processId,
    channelId,
    expiryTime,
    sharedData,
    commitment,
  );
  const newProtocolState = states.waitForDispute({
    ...protocolState,
    disputeState: disputeState.protocolState,
  });
  return {
    protocolState: newProtocolState,
    sharedData: { ...disputeState.sharedData, currentProcessId: APPLICATION_PROCESS_ID },
  };
}

function handleDisputeAction(
  protocolState: states.NonTerminalApplicationState,
  sharedData: SharedData,
  action: dispute.DisputeAction,
): ProtocolStateWithSharedData<states.ApplicationState> {
  if (protocolState.type !== 'Application.WaitForDispute') {
    return { protocolState, sharedData };
  }
  const newDisputeState = disputeReducer(protocolState.disputeState, sharedData, action);
  if (
    newDisputeState.protocolState.type === 'Challenging.SuccessOpen' ||
    newDisputeState.protocolState.type === 'Challenging.Failure' ||
    newDisputeState.protocolState.type === 'Responding.Success'
  ) {
    return {
      protocolState: states.ongoing({ ...protocolState }),
      sharedData: newDisputeState.sharedData,
    };
  }
  if (
    newDisputeState.protocolState.type === 'Challenging.SuccessClosed' ||
    newDisputeState.protocolState.type === 'Responding.Failure'
  ) {
    return {
      protocolState: states.success({ ...protocolState }),
      sharedData: newDisputeState.sharedData,
    };
  }
  const newApplicationState = { ...protocolState, disputeState: newDisputeState.protocolState };
  return { protocolState: newApplicationState, sharedData: newDisputeState.sharedData };
}

const validateAndUpdate = (
  commitment: Commitment,
  signature: string,
  state: states.ApplicationState,
  sharedData: SharedData,
) => {
  if (state.type === 'Application.WaitForFirstCommitment') {
    return checkAndInitialize(sharedData.channelStore, { commitment, signature }, state.privateKey);
  } else {
    return checkAndStore(sharedData.channelStore, { commitment, signature });
  }
};

const signAndUpdate = (
  commitment: Commitment,
  state: states.ApplicationState,
  sharedData: SharedData,
) => {
  if (state.type === 'Application.WaitForFirstCommitment') {
    return signAndInitialize(sharedData.channelStore, commitment, state.privateKey);
  } else {
    return signAndStore(sharedData.channelStore, commitment);
  }
};
