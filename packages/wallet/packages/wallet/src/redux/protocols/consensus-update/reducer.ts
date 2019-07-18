import { SharedData, signAndStore, getExistingChannel } from '../../state';
import * as states from './states';
import { ProtocolStateWithSharedData, makeLocator } from '..';
import { isConsensusUpdateAction, ClearedToSend } from './actions';
import * as helpers from '../reducer-helpers';
import {
  proposeNewConsensus,
  acceptConsensus,
  voteForConsensus,
  consensusHasBeenReached,
} from '../../../domain/consensus-app';
import { Commitment } from '../../../domain';
import { appAttributesFromBytes } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { eqHexArray } from '../../../utils/hex-utils';
import { CommitmentsReceived, EmbeddedProtocol } from '../../../communication';
import { WalletAction } from '../../actions';
import { unreachable } from '../../../utils/reducer-utils';

export const CONSENSUS_UPDATE_PROTOCOL_LOCATOR = makeLocator(EmbeddedProtocol.ConsensusUpdate);

export const initialize = (
  processId: string,
  channelId: string,
  clearedToSend: boolean,
  proposedAllocation: string[],
  proposedDestination: string[],
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  const sendUpdate = helpers.isFirstPlayer(channelId, sharedData) && clearedToSend;
  if (sendUpdate) {
    try {
      sharedData = sendProposal(
        processId,
        channelId,
        proposedAllocation,
        proposedDestination,
        sharedData,
      );
    } catch (error) {
      return {
        protocolState: states.failure({ reason: error.message }),
        sharedData,
      };
    }
  }

  return {
    protocolState: states.waitForUpdate({
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
      clearedToSend,
      updateSent: sendUpdate,
    }),
    sharedData,
  };
};
const handleClearedToSend = (
  protocolState: states.ConsensusUpdateState,
  sharedData: SharedData,
  action: ClearedToSend,
): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  if (protocolState.type !== 'ConsensusUpdate.WaitForUpdate') {
    console.warn(`Consensus update reducer was called with terminal state ${protocolState.type}`);
    return { protocolState, sharedData };
  }
  const { processId, channelId, proposedAllocation, proposedDestination } = protocolState;
  let updateSent = protocolState.updateSent;
  const shouldUpdateBeSent = !updateSent && helpers.ourTurn(sharedData, channelId);
  if (shouldUpdateBeSent) {
    try {
      if (helpers.isFirstPlayer(channelId, sharedData)) {
        sharedData = sendProposal(
          processId,
          channelId,
          proposedAllocation,
          proposedDestination,
          sharedData,
        );
      } else {
        sharedData = sendAcceptConsensus(processId, channelId, sharedData);
      }
      updateSent = true;
    } catch (error) {
      return {
        protocolState: states.failure({ reason: error.message }),
        sharedData,
      };
    }
  }
  const latestCommitment = helpers.getLatestCommitment(channelId, sharedData);
  // If we are the last player we would be the one reaching consensus so we check again
  if (consensusReached(latestCommitment, proposedAllocation, proposedDestination)) {
    return { protocolState: states.success({}), sharedData };
  }
  return {
    protocolState: states.waitForUpdate({ ...protocolState, updateSent, clearedToSend: true }),
    sharedData,
  };
};
const handleCommitmentReceived = (
  protocolState: states.ConsensusUpdateState,
  sharedData: SharedData,
  action: CommitmentsReceived,
): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  if (protocolState.type !== 'ConsensusUpdate.WaitForUpdate') {
    console.warn(`Consensus update reducer was called with terminal state ${protocolState.type}`);
    return { protocolState, sharedData };
  }
  const { channelId, processId, clearedToSend } = protocolState;

  try {
    const { turnNum } = getExistingChannel(sharedData, channelId);
    sharedData = helpers.checkCommitments(sharedData, turnNum, action.signedCommitments);
  } catch (err) {
    return {
      protocolState: states.failure({ reason: `UnableToValidate: ${err.message}` }),
      sharedData,
    };
  }

  const { proposedAllocation, proposedDestination } = protocolState;
  let latestCommitment = helpers.getLatestCommitment(channelId, sharedData);
  if (consensusReached(latestCommitment, proposedAllocation, proposedDestination)) {
    return { protocolState: states.success({}), sharedData };
  }

  if (
    !proposalCommitmentHasExpectedValues(latestCommitment, proposedAllocation, proposedDestination)
  ) {
    return {
      protocolState: states.failure({ reason: 'Proposal does not match expected values.' }),
      sharedData,
    };
  }
  let updateSent = protocolState.updateSent;
  if (helpers.ourTurn(sharedData, channelId) && clearedToSend) {
    try {
      sharedData = sendAcceptConsensus(processId, channelId, sharedData);
      updateSent = true;
    } catch (error) {
      return {
        protocolState: states.failure({ reason: error.message }),
        sharedData,
      };
    }
  }

  latestCommitment = helpers.getLatestCommitment(channelId, sharedData);
  // If we are the last player we would be the one reaching consensus so we check again
  if (consensusReached(latestCommitment, proposedAllocation, proposedDestination)) {
    return { protocolState: states.success({}), sharedData };
  }
  return { protocolState: states.waitForUpdate({ ...protocolState, updateSent }), sharedData };
};

export const consensusUpdateReducer = (
  protocolState: states.ConsensusUpdateState,
  sharedData: SharedData,
  action: WalletAction,
): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  if (!isConsensusUpdateAction(action)) {
    console.warn(`Consensus Update received non Consensus Update action ${action}`);
    return { protocolState, sharedData };
  }
  switch (action.type) {
    case 'WALLET.COMMON.COMMITMENTS_RECEIVED':
      return handleCommitmentReceived(protocolState, sharedData, action);
    case 'WALLET.CONSENSUS_UPDATE.CLEARED_TO_SEND':
      return handleClearedToSend(protocolState, sharedData, action);
    default:
      return unreachable(action);
  }
};

function consensusReached(
  commitment: Commitment,
  expectedAllocation: string[],
  expectedDestination: string[],
): boolean {
  return (
    consensusHasBeenReached(commitment) &&
    eqHexArray(commitment.allocation, expectedAllocation) &&
    eqHexArray(commitment.destination, expectedDestination)
  );
}

function proposalCommitmentHasExpectedValues(
  commitment: Commitment,
  expectedAllocation: string[],
  expectedDestination: string[],
): boolean {
  const { proposedAllocation, proposedDestination } = appAttributesFromBytes(
    commitment.appAttributes,
  );
  return (
    eqHexArray(proposedAllocation, expectedAllocation) &&
    eqHexArray(proposedDestination, expectedDestination)
  );
}
function sendAcceptConsensus(
  processId: string,
  channelId: string,
  sharedData: SharedData,
): SharedData {
  const lastCommitment = helpers.getLatestCommitment(channelId, sharedData);
  const ourCommitment = helpers.isLastPlayer(channelId, sharedData)
    ? acceptConsensus(lastCommitment)
    : voteForConsensus(lastCommitment);

  const signResult = signAndStore(sharedData, ourCommitment);
  if (!signResult.isSuccess) {
    throw new Error('Signature Failure');
  }
  sharedData = signResult.store;
  sharedData = helpers.sendCommitments(
    sharedData,
    processId,
    channelId,
    CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
  );
  return sharedData;
}

function sendProposal(
  processId: string,
  channelId: string,
  proposedAllocation: string[],
  proposedDestination: string[],
  sharedData: SharedData,
): SharedData {
  const lastCommitment = helpers.getLatestCommitment(channelId, sharedData);
  const ourCommitment = proposeNewConsensus(
    lastCommitment,
    proposedAllocation,
    proposedDestination,
  );
  const signResult = signAndStore(sharedData, ourCommitment);
  if (!signResult.isSuccess) {
    throw new Error('SignatureFailure');
  }
  sharedData = signResult.store;

  sharedData = helpers.sendCommitments(
    sharedData,
    processId,
    channelId,
    CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
  );
  return sharedData;
}
