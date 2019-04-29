import { ProtocolStateWithSharedData } from '..';
import { SharedData, setChannelStore, queueMessage } from '../../state';
import * as states from './state';
import { IndirectDefundingAction } from './actions';
import { COMMITMENT_RECEIVED } from '../../actions';
import { Commitment } from 'fmg-core/lib/commitment';
import * as helpers from '../reducer-helpers';
import { getChannelState } from '../../selectors';
import { unreachable } from '../../../utils/reducer-utils';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import { PlayerIndex } from '../../types';
import { checkAndStore, signAndStore } from '../../channel-store/reducer';

export const initialize = (
  processId: string,
  channelId: string,
  proposedAllocation: string[],
  proposedDestination: string[],
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  if (!helpers.channelIsClosed(channelId, sharedData)) {
    return {
      protocolState: states.failure('Channel Not Closed'),
      sharedData,
    };
  }
  let newSharedData = { ...sharedData };
  if (helpers.isFirstPlayer(channelId, sharedData)) {
    newSharedData = craftAndSendLegerUpdate(
      newSharedData,
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
    );
  }
  return {
    protocolState: states.waitForLedgerUpdate({
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
    }),
    sharedData: newSharedData,
  };
};

export const indirectDefundingReducer = (
  protocolState: states.IndirectDefundingState,
  sharedData: SharedData,
  action: IndirectDefundingAction,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  switch (protocolState.type) {
    case states.WAIT_FOR_LEDGER_UPDATE:
      return waitForLedgerUpdateReducer(protocolState, sharedData, action);
    case states.WAIT_FOR_FINAL_LEDGER_UPDATE:
      return waitForFinalLedgerUpdateReducer(protocolState, sharedData, action);
    case states.SUCCESS:
    case states.FAILURE:
      return { protocolState, sharedData };
    default:
      return unreachable(protocolState);
  }
};
const waitForFinalLedgerUpdateReducer = (
  protocolState: states.WaitForFinalLedgerUpdate,
  sharedData: SharedData,
  action: IndirectDefundingAction,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  if (action.type !== COMMITMENT_RECEIVED) {
    return { protocolState, sharedData };
  }
  const { commitment, signature } = action.signedCommitment;
  const newSharedData = receiveLedgerCommitment(sharedData, commitment, signature);
  if (!validTransition(newSharedData, protocolState.channelId, commitment)) {
    return {
      protocolState: states.failure('Received Invalid Commitment'),
      sharedData: newSharedData,
    };
  }
  return { protocolState: states.success(), sharedData: newSharedData };
};

const waitForLedgerUpdateReducer = (
  protocolState: states.WaitForLedgerUpdate,
  sharedData: SharedData,
  action: IndirectDefundingAction,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  if (action.type !== COMMITMENT_RECEIVED) {
    return { protocolState, sharedData };
  }
  const { commitment, signature } = action.signedCommitment;
  let newSharedData = receiveLedgerCommitment(sharedData, commitment, signature);
  if (!validTransition(newSharedData, protocolState.channelId, commitment)) {
    return {
      protocolState: states.failure('Received Invalid Commitment'),
      sharedData: newSharedData,
    };
  }
  const { processId, channelId, proposedAllocation, proposedDestination } = protocolState;
  if (helpers.isFirstPlayer(protocolState.channelId, newSharedData)) {
    newSharedData = craftFinalLedgerUpdate(
      newSharedData,
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
    );
    return {
      protocolState: states.success(),
      sharedData: newSharedData,
    };
  } else {
    newSharedData = craftAndSendLegerUpdate(
      newSharedData,
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
    );
    return {
      protocolState: states.waitForFinalLedgerUpdate(protocolState),
      sharedData: newSharedData,
    };
  }
};

const receiveLedgerCommitment = (
  sharedData: SharedData,
  commitment: Commitment,
  signature: string,
): SharedData => {
  const result = checkAndStore(sharedData.channelStore, { commitment, signature });
  if (result.isSuccess) {
    return setChannelStore(sharedData, result.store);
  }
  return sharedData;
};

// TODO: Once the channel state is simplified we can probably rely on a better check than this
const validTransition = (
  sharedData: SharedData,
  channelId: string,
  commitment: Commitment,
): boolean => {
  return getChannelState(sharedData, channelId).lastCommitment.commitment === commitment;
};

const craftAndSendLegerUpdate = (
  sharedData: SharedData,
  processId: string,
  channelId: string,
  proposedAllocation: string[],
  proposedDestination: string[],
): SharedData => {
  const channelState = getChannelState(sharedData, channelId);
  const appAttributes = bytesFromAppAttributes({
    consensusCounter: channelState.ourIndex,
    proposedAllocation,
    proposedDestination,
  });
  const lastCommitment = channelState.lastCommitment.commitment;

  const newCommitment: Commitment = {
    ...lastCommitment,
    commitmentCount: channelState.ourIndex,
    turnNum: lastCommitment.turnNum + 1,
    appAttributes,
  };

  return receiveAndSendUpdateCommitment(
    sharedData,
    processId,
    channelId,
    newCommitment,
    channelState.ourIndex,
  );
};

const craftFinalLedgerUpdate = (
  sharedData: SharedData,
  processId: string,
  channelId: string,
  proposedAllocation: string[],
  proposedDestination: string[],
): SharedData => {
  const channelState = getChannelState(sharedData, channelId);
  const appAttributes = bytesFromAppAttributes({
    consensusCounter: 0,
    proposedAllocation,
    proposedDestination,
  });
  const lastCommitment = channelState.lastCommitment.commitment;

  const newCommitment: Commitment = {
    ...lastCommitment,
    commitmentCount: 0,
    turnNum: lastCommitment.turnNum + 1,
    appAttributes,
    allocation: proposedAllocation,
    destination: proposedDestination,
  };

  return receiveAndSendUpdateCommitment(
    sharedData,
    processId,
    channelId,
    newCommitment,
    PlayerIndex.A,
  );
};

const receiveAndSendUpdateCommitment = (
  sharedData: SharedData,
  processId: string,
  channelId: string,
  commitment: Commitment,
  ourIndex: PlayerIndex,
) => {
  const channelState = getChannelState(sharedData, channelId);
  const result = signAndStore(sharedData.channelStore, commitment);
  if (result.isSuccess) {
    const newSharedData = setChannelStore(sharedData, result.store);
    const message = helpers.createCommitmentMessageRelay(
      processId,
      channelState.participants[ourIndex],
      commitment,
      result.signedCommitment.signature,
    );

    return queueMessage(newSharedData, message);
  }

  return sharedData;
};
