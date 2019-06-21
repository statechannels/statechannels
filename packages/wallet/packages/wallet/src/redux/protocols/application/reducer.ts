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
    sharedData: registerChannelToMonitor(sharedData, APPLICATION_PROCESS_ID, channelId),
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
  switch (action.type) {
    case 'WALLET.APPLICATION.OPPONENT_COMMITMENT_RECEIVED':
      return opponentCommitmentReceivedReducer(protocolState, sharedData, action);
    case 'WALLET.APPLICATION.OWN_COMMITMENT_RECEIVED':
      return ownCommitmentReceivedReducer(protocolState, sharedData, action);
    case 'WALLET.APPLICATION.CONCLUDED':
      return { sharedData, protocolState: states.success({}) };
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
