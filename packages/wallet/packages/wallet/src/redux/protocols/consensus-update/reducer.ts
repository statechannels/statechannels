import { SharedData, getChannel, signAndStore, queueMessage, checkAndStore } from '../../state';
import * as states from './states';
import { ProtocolStateWithSharedData } from '..';
import { ConsensusUpdateAction } from './actions';
import * as helpers from '../reducer-helpers';
import { theirAddress, getLastCommitment } from '../../channel-store';
import { proposeNewConsensus, acceptConsensus } from '../../../domain/two-player-consensus-game';
import { sendCommitmentReceived } from '../../../communication';
import { Commitment } from '../../../domain';
import { appAttributesFromBytes } from 'fmg-nitro-adjudicator';
export const CONSENSUS_UPDATE_PROTOCOL_LOCATOR = 'ConsensusUpdate';
export const initialize = (
  processId: string,
  channelId: string,
  proposedAllocation: string[],
  proposedDestination: string[],
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  const lastCommitment = getLatestCommitment(sharedData, channelId);

  if (helpers.isFirstPlayer(channelId, sharedData)) {
    const ourCommitment = proposeNewConsensus(
      lastCommitment,
      proposedAllocation,
      proposedDestination,
    );
    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return { protocolState: states.failure({ reason: 'Signature Failure' }), sharedData };
    }
    sharedData = signResult.store;

    const messageRelay = sendCommitmentReceived(
      getOpponentAddress(sharedData, channelId),
      processId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
      CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
    );
    sharedData = queueMessage(sharedData, messageRelay);
  }

  return {
    protocolState: states.waitForUpdate({
      processId,
      channelId,
      proposedAllocation,
      proposedDestination,
    }),
    sharedData,
  };
};

export const consensusUpdateReducer = (
  protocolState: states.ConsensusUpdateState,
  sharedData: SharedData,
  action: ConsensusUpdateAction,
): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  if (action.type !== 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    console.warn(
      `Ledger Top Up Protocol expected COMMITMENT_RECEIVED received ${action.type} instead.`,
    );
    return { protocolState, sharedData };
  }
  if (protocolState.type !== 'ConsensusUpdate.WaitForUpdate') {
    console.warn(`Consensus update reducer was called with terminal state ${protocolState.type}`);
    return { protocolState, sharedData };
  }

  const checkResult = checkAndStore(sharedData, action.signedCommitment);

  if (!checkResult.isSuccess) {
    return {
      protocolState: states.failure({ reason: 'Received Invalid Commitment' }),
      sharedData,
    };
  }
  sharedData = checkResult.store;

  // Accept consensus if player B
  if (!helpers.isFirstPlayer(protocolState.channelId, sharedData)) {
    if (
      !proposalCommitmentHasExpectedValues(
        action.signedCommitment.commitment,
        protocolState.proposedAllocation,
        protocolState.proposedDestination,
      )
    ) {
      return {
        protocolState: states.failure({ reason: 'Proposal does not match expected values.' }),
        sharedData,
      };
    }
    const ourCommitment = acceptConsensus(action.signedCommitment.commitment);
    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return { protocolState: states.failure({ reason: 'Signature Failure' }), sharedData };
    }
    sharedData = signResult.store;

    const messageRelay = sendCommitmentReceived(
      getOpponentAddress(sharedData, protocolState.channelId),
      protocolState.processId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
      CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
    );
    sharedData = queueMessage(sharedData, messageRelay);
  }
  return { protocolState: states.success({}), sharedData };
};

function getOpponentAddress(sharedData: SharedData, channelId: string) {
  const channel = getChannel(sharedData, channelId);
  if (!channel) {
    throw new Error(`Could not find channel for id ${channelId}`);
  }

  return theirAddress(channel);
}
function getLatestCommitment(sharedData: SharedData, channelId: string) {
  const channel = getChannel(sharedData, channelId);
  if (!channel) {
    throw new Error(`Could not find channel for id ${channelId}`);
  }

  return getLastCommitment(channel);
}

function proposalCommitmentHasExpectedValues(
  commitment: Commitment,
  expectedAllocation: string[],
  expectedDestination: string[],
): boolean {
  const { proposedAllocation, proposedDestination } = appAttributesFromBytes(
    commitment.appAttributes,
  );
  if (
    proposedAllocation.length !== expectedAllocation.length ||
    proposedDestination.length !== expectedDestination.length
  ) {
    return false;
  }

  for (let i = 0; i < proposedAllocation.length; i++) {
    if (
      proposedAllocation[i] !== expectedAllocation[i] ||
      proposedDestination[i] !== expectedDestination[i]
    ) {
      return false;
    }
  }
  return true;
}
