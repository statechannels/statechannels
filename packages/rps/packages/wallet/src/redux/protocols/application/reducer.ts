import { SharedData, queueMessage } from '../../state';
import * as states from './states';
import * as actions from './actions';
import { ProtocolStateWithSharedData } from '..';
import * as ethers from 'ethers';
import { unreachable } from '../../../utils/reducer-utils';
import { channelID } from 'fmg-core/lib/channel';
import {
  channelInitializationSuccess,
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
import { ADDRESS_KNOWN } from './states';
import { Commitment } from '../../../domain';

// TODO: Right now we're using a fixed application ID
// since we're not too concerned with handling multiple running app channels.
// This might need to change in the future.
export const APPLICATION_PROCESS_ID = 'Application';

export function initialize(
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.ApplicationState> {
  const { privateKey, address } = ethers.Wallet.createRandom();
  const newSharedData = queueMessage(sharedData, channelInitializationSuccess(address));
  return {
    protocolState: states.addressKnown(address, privateKey),
    sharedData: newSharedData,
  };
}

export function applicationReducer(
  protocolState: states.ApplicationState,
  sharedData: SharedData,
  action: actions.ApplicationAction,
): ProtocolStateWithSharedData<states.ApplicationState> {
  if (states.isTerminal(protocolState)) {
    return { protocolState, sharedData };
  }
  switch (action.type) {
    case actions.OPPONENT_COMMITMENT_RECEIVED:
      return opponentCommitmentReceivedReducer(protocolState, sharedData, action);
    case actions.OWN_COMMITMENT_RECEIVED:
      return ownCommitmentReceivedReducer(protocolState, sharedData, action);
    case actions.CLOSE_REQUESTED:
      return { sharedData, protocolState: states.success() };
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
      protocolState: updateProtocolState(protocolState, action),
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
      protocolState: updateProtocolState(protocolState, action),
    };
  }
}

const updateProtocolState = (
  protocolState: states.NonTerminalApplicationState,
  action: actions.OwnCommitmentReceived | actions.OpponentCommitmentReceived,
): states.ApplicationState => {
  let channelId;
  if (protocolState.type === 'AddressKnown') {
    channelId = channelID(action.commitment.channel);
  } else {
    channelId = protocolState.channelId;
  }
  return states.ongoing(channelId);
};

const validateAndUpdate = (
  commitment: Commitment,
  signature: string,
  state: states.ApplicationState,
  sharedData: SharedData,
) => {
  if (state.type === ADDRESS_KNOWN) {
    return checkAndInitialize(
      sharedData.channelStore,
      { commitment, signature },
      state.address,
      state.privateKey,
    );
  } else {
    return checkAndStore(sharedData.channelStore, { commitment, signature });
  }
};

const signAndUpdate = (
  commitment: Commitment,
  state: states.ApplicationState,
  sharedData: SharedData,
) => {
  if (state.type === ADDRESS_KNOWN) {
    return signAndInitialize(sharedData.channelStore, commitment, state.address, state.privateKey);
  } else {
    return signAndStore(sharedData.channelStore, commitment);
  }
};
