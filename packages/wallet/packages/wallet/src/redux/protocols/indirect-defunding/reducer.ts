import { ProtocolStateWithSharedData } from '..';
import { SharedData, signAndStore, queueMessage, checkAndStore } from '../../state';
import * as states from './states';
import { IndirectDefundingAction } from './actions';
import * as helpers from '../reducer-helpers';
import { unreachable } from '../../../utils/reducer-utils';
import * as selectors from '../../selectors';
import { proposeNewConsensus, acceptConsensus } from '../../../domain/consensus-app';
import {
  sendCommitmentReceived,
  multipleRelayableActions,
  commitmentReceived,
} from '../../../communication';
import { theirAddress, getLastCommitment } from '../../channel-store';
import { composeConcludeCommitment } from '../../../utils/commitment-utils';
import { CommitmentReceived } from '../../actions';
import { messageRelayRequested } from 'magmo-wallet-client';
import { defundRequested } from '../actions';

export const initialize = (
  processId: string,
  channelId: string,
  ledgerId: string,
  proposedAllocation: string[],
  proposedDestination: string[],
  sharedData: SharedData,
  action?: CommitmentReceived,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  if (!helpers.channelIsClosed(channelId, sharedData)) {
    return {
      protocolState: states.failure({ reason: 'Channel Not Closed' }),
      sharedData,
    };
  }
  let newSharedData = { ...sharedData };
  if (helpers.isFirstPlayer(ledgerId, sharedData)) {
    const ledgerChannel = selectors.getChannelState(sharedData, ledgerId);

    const theirCommitment = getLastCommitment(ledgerChannel);
    const ourCommitment = proposeNewConsensus(
      theirCommitment,
      proposedAllocation,
      proposedDestination,
    );
    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return {
        protocolState: states.failure({ reason: 'Received Invalid Commitment' }),
        sharedData,
      };
    }
    newSharedData = signResult.store;

    const actionToRelay = multipleRelayableActions({
      actions: [
        // send a request for opponent to start new defunding process first, because they may not yet have done so
        defundRequested({
          channelId,
        }),
        commitmentReceived({
          processId,
          signedCommitment: {
            commitment: signResult.signedCommitment.commitment,
            signature: signResult.signedCommitment.signature,
          },
          protocolLocator: [],
        }),
      ],
    });

    const messageRelay = messageRelayRequested(theirAddress(ledgerChannel), actionToRelay);

    newSharedData = queueMessage(newSharedData, messageRelay);
  }

  const protocolState = states.waitForLedgerUpdate({
    processId,
    ledgerId,
    channelId,
    proposedAllocation,
    proposedDestination,
  });

  if (!helpers.isFirstPlayer && action) {
    // are we second player?
    return waitForLedgerUpdateReducer(protocolState, sharedData, action);
  }
  return {
    protocolState,
    sharedData: newSharedData,
  };
};

export const indirectDefundingReducer = (
  protocolState: states.IndirectDefundingState,
  sharedData: SharedData,
  action: IndirectDefundingAction,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  switch (protocolState.type) {
    case 'IndirectDefunding.WaitForLedgerUpdate':
      return waitForLedgerUpdateReducer(protocolState, sharedData, action);
    case 'IndirectDefunding.WaitForConclude':
      return waitForConcludeReducer(protocolState, sharedData, action);
    case 'IndirectDefunding.Success':
    case 'IndirectDefunding.Failure':
      return { protocolState, sharedData };
    default:
      return unreachable(protocolState);
  }
};

const waitForConcludeReducer = (
  protocolState: states.WaitForConclude,
  sharedData: SharedData,
  action: IndirectDefundingAction,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  if (action.type !== 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    throw new Error(`Invalid action ${action.type}`);
  }

  let newSharedData = { ...sharedData };

  const checkResult = checkAndStore(newSharedData, action.signedCommitment);
  if (!checkResult.isSuccess) {
    return { protocolState: states.failure({ reason: 'Received Invalid Commitment' }), sharedData };
  }
  newSharedData = checkResult.store;

  if (!helpers.isFirstPlayer(protocolState.ledgerId, sharedData)) {
    newSharedData = createAndSendConcludeCommitment(
      newSharedData,
      protocolState.processId,
      protocolState.ledgerId,
    );
  }

  return {
    protocolState: states.success({}),
    sharedData: newSharedData,
  };
};

const waitForLedgerUpdateReducer = (
  protocolState: states.WaitForLedgerUpdate,
  sharedData: SharedData,
  action: IndirectDefundingAction,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  if (action.type !== 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    throw new Error(`Invalid action ${action.type}`);
  }

  let newSharedData = { ...sharedData };

  const checkResult = checkAndStore(newSharedData, action.signedCommitment);
  if (!checkResult.isSuccess) {
    return { protocolState: states.failure({ reason: 'Received Invalid Commitment' }), sharedData };
  }
  newSharedData = checkResult.store;

  if (!helpers.isFirstPlayer(protocolState.channelId, sharedData)) {
    const theirCommitment = action.signedCommitment.commitment;
    const ourCommitment = acceptConsensus(theirCommitment);
    const signResult = signAndStore(newSharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return {
        protocolState: states.failure({ reason: 'Received Invalid Commitment' }),
        sharedData: newSharedData,
      };
    }
    newSharedData = signResult.store;
    const { ledgerId, processId } = protocolState;
    const ledgerChannel = selectors.getChannelState(newSharedData, ledgerId);

    const messageRelay = sendCommitmentReceived(
      theirAddress(ledgerChannel),
      processId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
    );
    newSharedData = queueMessage(newSharedData, messageRelay);
  } else {
    newSharedData = createAndSendConcludeCommitment(
      newSharedData,
      protocolState.processId,
      protocolState.ledgerId,
    );
  }
  return { protocolState: states.waitForConclude(protocolState), sharedData: newSharedData };
};

// Helpers

const createAndSendConcludeCommitment = (
  sharedData: SharedData,
  processId: string,
  channelId: string,
): SharedData => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);

  const commitment = composeConcludeCommitment(channelState);

  const signResult = signAndStore(sharedData, commitment);
  if (!signResult.isSuccess) {
    throw new Error(`Could not sign commitment due to  ${signResult.reason}`);
  }

  const messageRelay = sendCommitmentReceived(
    theirAddress(channelState),
    processId,
    signResult.signedCommitment.commitment,
    signResult.signedCommitment.signature,
  );
  return queueMessage(signResult.store, messageRelay);
};
