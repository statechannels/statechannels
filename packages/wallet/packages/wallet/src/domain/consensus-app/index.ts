import {
  ConsensusBaseCommitment,
  bytesFromAppAttributes,
  appAttributesFromBytes,
  finalVote,
  propose,
  isProposal,
  isConsensusReached,
  vote,
  ConsensusCommitment,
  AppAttributes,
  AppCommitment,
} from 'fmg-nitro-adjudicator/lib/consensus-app';
import { Commitment } from 'fmg-core';
import { CommitmentType } from '../commitments';
/////////////
// Helpers //
/////////////

export function consensusHasBeenReached(commitment: Commitment): boolean {
  const consensusCommitment = fromCoreCommitment(commitment);
  return consensusCommitment.appAttributes.furtherVotesRequired === 0;
}

export function voteForConsensus(commitment: Commitment): Commitment {
  const fromCommitment = fromCoreCommitment(commitment);
  if (!isProposal(fromCommitment)) {
    throw new Error('The received commitment was not a ledger proposal');
  }
  return asCoreCommitment(vote(fromCommitment as AppCommitment));
}

export function acceptConsensus(commitment: Commitment): Commitment {
  const fromCommitment = fromCoreCommitment(commitment);
  if (!isProposal(fromCommitment)) {
    throw new Error('The received commitment was not a ledger proposal');
  }
  return asCoreCommitment(finalVote(fromCommitment as AppCommitment));
}

// TODO: Should we use a Balance interface instead of proposedAlloc/Dest
export function proposeNewConsensus(
  commitment: Commitment,
  proposedAllocation: string[],
  proposedDestination: string[],
): Commitment {
  const fromCommitment = fromCoreCommitment(commitment);
  if (!isConsensusReached(fromCommitment)) {
    throw new Error('The received commitment was not a ledger consensus');
  }
  const proposeCommitment = propose(
    fromCommitment as AppCommitment,
    proposedAllocation,
    proposedDestination,
  );
  return asCoreCommitment(proposeCommitment);
}

export function asCoreCommitment(commitment: ConsensusBaseCommitment): Commitment {
  const { channel, turnNum, allocation, destination, commitmentCount, appAttributes } = commitment;
  const { furtherVotesRequired, proposedAllocation, proposedDestination } = appAttributes;

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
    }),
  };
}

export function fromCoreCommitment(commitment: Commitment): ConsensusCommitment {
  const appAttributes: AppAttributes = appAttributesFromBytes(commitment.appAttributes);
  return { ...commitment, appAttributes } as ConsensusCommitment;
}
