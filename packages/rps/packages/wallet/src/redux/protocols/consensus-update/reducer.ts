import { SharedData, signAndStore, getExistingChannel } from '../../state';
import * as states from './states';
import { ProtocolStateWithSharedData } from '..';
import { ConsensusUpdateAction, isConsensusUpdateAction } from './actions';
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

export const CONSENSUS_UPDATE_PROTOCOL_LOCATOR = 'ConsensusUpdate';

export const initialize = (
  processId: string,
  channelId: string,
  proposedAllocation: string[],
  proposedDestination: string[],
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  const lastCommitment = helpers.getLatestCommitment(channelId, sharedData);

  if (helpers.isFirstPlayer(channelId, sharedData)) {
    const ourCommitment = proposeNewConsensus(
      lastCommitment,
      proposedAllocation,
      proposedDestination,
    );
    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return {
        protocolState: states.failure({
          reason: 'Signature Failure',
        }),
        sharedData,
      };
    }
    sharedData = signResult.store;

    sharedData = helpers.sendCommitments(
      sharedData,
      processId,
      channelId,
      CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
    );
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
  if (!isConsensusUpdateAction(action)) {
    console.warn(`Consensus Update received non Consensus Update action ${action}`);
    return { protocolState, sharedData };
  }
  if (protocolState.type !== 'ConsensusUpdate.WaitForUpdate') {
    console.warn(`Consensus update reducer was called with terminal state ${protocolState.type}`);
    return { protocolState, sharedData };
  }
  const { channelId, processId } = protocolState;

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

  if (helpers.ourTurn(sharedData, channelId)) {
    const ourCommitment = helpers.isLastPlayer(channelId, sharedData)
      ? acceptConsensus(latestCommitment)
      : voteForConsensus(latestCommitment);

    const signResult = signAndStore(sharedData, ourCommitment);
    if (!signResult.isSuccess) {
      return {
        protocolState: states.failure({ reason: 'Signature Failure' }),
        sharedData,
      };
    }
    sharedData = signResult.store;
    sharedData = helpers.sendCommitments(
      sharedData,
      processId,
      channelId,
      CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
    );
  }

  latestCommitment = helpers.getLatestCommitment(channelId, sharedData);
  // If we are the last player we would be the one reaching consensus so we check again
  if (consensusReached(latestCommitment, proposedAllocation, proposedDestination)) {
    return { protocolState: states.success({}), sharedData };
  }
  return { protocolState: states.waitForUpdate(protocolState), sharedData };
};

function consensusReached(
  commitment: Commitment,
  expectedAllocation: string[],
  expectedDestination: string[],
) {
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
