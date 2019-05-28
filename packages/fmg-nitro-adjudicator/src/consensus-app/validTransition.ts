import { AppCommitment, isConsensusReached, isProposal, UpdateType } from '.';
export function validTransition(oldCommitment: AppCommitment, newCommitment: AppCommitment): true {
  // Commitment validation

  if (oldCommitment.appAttributes.updateType === UpdateType.Proposal) {
    validProposeCommitment(oldCommitment);
  } else if (oldCommitment.appAttributes.updateType === UpdateType.Consensus) {
    validConsensusCommitment(oldCommitment);
  }
  if (newCommitment.appAttributes.updateType === UpdateType.Proposal) {
    validProposeCommitment(newCommitment);
  } else if (newCommitment.appAttributes.updateType === UpdateType.Consensus) {
    validConsensusCommitment(newCommitment);
  }

  // State machine transition identifier
  if (isConsensusReached(oldCommitment)) {
    if (isProposal(newCommitment)) {
      validatePropose(oldCommitment, newCommitment);
      return true;
    }
    if (isConsensusReached(newCommitment)) {
      validatePass(oldCommitment, newCommitment);
      return true;
    }
  }
  if (isProposal(oldCommitment)) {
    if (isProposal(newCommitment)) {
      if (hasFurtherVotesNeededBeenInitialized(newCommitment)) {
        validatePropose(oldCommitment, newCommitment);
        return true;
      } else {
        validateVote(oldCommitment, newCommitment);
        return true;
      }
    }
    if (isConsensusReached(newCommitment)) {
      if (haveBalancesBeenUpdated(oldCommitment, newCommitment)) {
        validateFinalVote(oldCommitment, newCommitment);
        return true;
      } else {
        validateVeto(oldCommitment, newCommitment);
        return true;
      }
    }
  }
  throw new Error('ConsensusApp: No valid transition found for commitments');
}

function validatePass(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
  balancesUnchanged(oldCommitment, newCommitment);
  proposalsUnchanged(oldCommitment, newCommitment);
}
function validatePropose(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
  balancesUnchanged(oldCommitment, newCommitment);
  furtherVotesRequiredInitialized(newCommitment);
}
function validateFinalVote(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
  balancesUpdated(oldCommitment, newCommitment);
}
function validateVeto(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
  balancesUnchanged(oldCommitment, newCommitment);
}
function validateVote(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
  balancesUnchanged(oldCommitment, newCommitment);
  proposalsUnchanged(oldCommitment, newCommitment);
  furtherVotesRequiredDecremented(oldCommitment, newCommitment);
}

// helpers
function areEqual(left: string[], right: string[]) {
  // This is safe, as stringify behaves well on a flat array of strings
  return JSON.stringify(left) === JSON.stringify(right);
}
function haveBalancesBeenUpdated(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
  return (
    areEqual(oldCommitment.appAttributes.proposedAllocation, newCommitment.allocation) &&
    areEqual(oldCommitment.appAttributes.proposedDestination, newCommitment.destination)
  );
}
function hasFurtherVotesNeededBeenInitialized(commitment: AppCommitment): boolean {
  const numParticipants = commitment.channel.participants.length;
  return commitment.appAttributes.furtherVotesRequired === numParticipants - 1;
}

function balancesUpdated(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
  if (!areEqual(oldCommitment.appAttributes.proposedAllocation, newCommitment.allocation)) {
    throw new Error("ConsensusApp: 'allocation' must be set to the previous `proposedAllocation`.");
  }

  if (!areEqual(oldCommitment.appAttributes.proposedDestination, newCommitment.destination)) {
    throw new Error(
      "ConsensusApp: 'destination' must be set to the previous `proposedDestination`",
    );
  }
}
function balancesUnchanged(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
  if (!areEqual(oldCommitment.allocation, newCommitment.allocation)) {
    throw new Error("ConsensusApp: 'allocation' must be the same between commitments.");
  }

  if (!areEqual(oldCommitment.destination, newCommitment.destination)) {
    throw new Error("ConsensusApp: 'destination' must be the same between commitments.");
  }
}
function proposalsUnchanged(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
  if (
    !areEqual(
      oldCommitment.appAttributes.proposedAllocation,
      newCommitment.appAttributes.proposedAllocation,
    )
  ) {
    throw new Error("ConsensusApp: 'proposedAllocation' must be the same between commitments.");
  }
  if (
    !areEqual(
      oldCommitment.appAttributes.proposedDestination,
      newCommitment.appAttributes.proposedDestination,
    )
  ) {
    throw new Error("ConsensusApp: 'proposedDestination' must be the same between commitments.");
  }
}
function furtherVotesRequiredInitialized(commitment: AppCommitment) {
  const numParticipants = commitment.channel.participants.length;
  if (!(commitment.appAttributes.furtherVotesRequired === numParticipants - 1)) {
    throw new Error(
      'Consensus App: furtherVotesRequired needs to be initialized to the correct value.',
    );
  }
}
function furtherVotesRequiredDecremented(
  oldCommitment: AppCommitment,
  newCommitment: AppCommitment,
) {
  if (
    !(
      newCommitment.appAttributes.furtherVotesRequired ===
      oldCommitment.appAttributes.furtherVotesRequired - 1
    )
  ) {
    throw new Error('Consensus App: furtherVotesRequired should be decremented by 1.');
  }
}

function validConsensusCommitment(commitment: AppCommitment) {
  if (commitment.appAttributes.furtherVotesRequired !== 0) {
    throw new Error("ConsensusApp: 'furtherVotesRequired' must be 0 during consensus.");
  }

  if (!(commitment.appAttributes.proposedAllocation.length === 0)) {
    throw new Error("ConsensusApp: 'proposedAllocation' must be reset during consensus.");
  }

  if (!(commitment.appAttributes.proposedDestination.length === 0)) {
    throw new Error("ConsensusApp: 'proposedDestination' must be reset during consensus.");
  }
}

function validProposeCommitment(commitment: AppCommitment) {
  if (commitment.appAttributes.furtherVotesRequired === 0) {
    throw new Error("ConsensusApp: 'furtherVotesRequired' must not be 0 during propose.");
  }

  if (!(commitment.appAttributes.proposedAllocation.length !== 0)) {
    throw new Error("ConsensusApp: 'proposedAllocation' must not be reset during propose.");
  }

  if (
    !(
      commitment.appAttributes.proposedDestination.length ===
      commitment.appAttributes.proposedAllocation.length
    )
  ) {
    throw new Error(
      "ConsensusApp: 'proposedDestination' and 'proposedAllocation' must be the same length during propose.",
    );
  }
}
