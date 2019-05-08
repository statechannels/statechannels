import {
  ConsensusBaseCommitment,
  ConsensusReachedCommitment,
  ProposalCommitment,
  UpdateType,
  bytesFromAppAttributes,
  appAttributesFromBytes,
  finalVote,
  propose,
} from 'fmg-nitro-adjudicator/lib/consensus-app';
import { Commitment } from 'fmg-core';
import { CommitmentType } from '../commitments';
/////////////
// Helpers //
/////////////

export function acceptConsensus(commitment: Commitment): Commitment {
  const fromCommitment = fromCoreCommitment(commitment);
  if (fromCommitment.updateType !== UpdateType.Proposal) {
    throw new Error('The received commitment was not a ledger proposal');
  }
  const acceptCommitment = finalVote(fromCommitment);
  // TODO: This should be done in the finalVote helper
  // Once the fmg-nitro-adjudicator package is part of apps
  // we can make the change there and remove this.
  acceptCommitment.furtherVotesRequired = 0;

  acceptCommitment.commitmentCount = 0;
  return asCoreCommitment(acceptCommitment);
}

// TODO: Should we use a Balance interface instead of proposedAlloc/Dest
export function proposeNewConsensus(
  commitment: Commitment,
  proposedAllocation: string[],
  proposedDestination: string[],
): Commitment {
  const fromCommitment = fromCoreCommitment(commitment);
  if (fromCommitment.updateType !== UpdateType.Consensus) {
    throw new Error('The received commitment was not a ledger consensus');
  }
  const proposeCommitment = propose(fromCommitment, proposedAllocation, proposedDestination);
  proposeCommitment.commitmentCount = 0;
  return asCoreCommitment(proposeCommitment);
}

export function asCoreCommitment(commitment: ConsensusBaseCommitment): Commitment {
  const {
    channel,
    updateType,
    turnNum,
    allocation,
    destination,
    commitmentCount,
    furtherVotesRequired,
    proposedAllocation,
    proposedDestination,
  } = commitment;

  return {
    channel,
    commitmentType: CommitmentType.App,
    turnNum,
    allocation,
    destination,
    commitmentCount,
    appAttributes: bytesFromAppAttributes({
      furtherVotesRequired,
      proposedAllocation,
      proposedDestination,
      updateType,
    }),
  };
}

// TODO it is weird/unexpected to use the conditional return
export function fromCoreCommitment(
  commitment: Commitment,
): ConsensusReachedCommitment | ProposalCommitment {
  const { channel, turnNum, allocation, destination, commitmentCount } = commitment;
  const {
    furtherVotesRequired,
    proposedAllocation,
    updateType,
    proposedDestination,
  } = appAttributesFromBytes(commitment.appAttributes);
  if (updateType === UpdateType.Consensus) {
    return {
      channel,
      turnNum,
      allocation,
      destination,
      commitmentCount,
      updateType,
      furtherVotesRequired,
      proposedAllocation,
      proposedDestination,
    };
  } else {
    return {
      channel,
      turnNum,
      allocation,
      destination,
      commitmentCount,
      updateType,
      furtherVotesRequired,
      proposedAllocation,
      proposedDestination,
    };
  }
}
