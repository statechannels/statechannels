import { AppCommitment } from '.';
export function validTransition(oldCommitment: AppCommitment, newCommitment: AppCommitment): true {
  if (oldCommitment.appAttributes.furtherVotesRequired === 0) {
    validateConsensusCommitment(oldCommitment);
  } else {
    validateProposeCommitment(oldCommitment);
  }

  if (newCommitment.appAttributes.furtherVotesRequired === 0) {
    validateConsensusCommitment(newCommitment);
  } else {
    validateProposeCommitment(newCommitment);
  }

  if (
    validatePropose(oldCommitment, newCommitment) ||
    validateVote(oldCommitment, newCommitment) ||
    validateVeto(oldCommitment, newCommitment) ||
    validatePass(oldCommitment, newCommitment) ||
    validateFinalVote(oldCommitment, newCommitment)
  ) {
    return true;
  }
  throw new Error('ConsensusApp: No valid transition found for commitments');
}

export function validatePropose(
  oldCommitment: AppCommitment,
  newCommitment: AppCommitment,
): boolean {
  if (furtherVotesRequiredInitialized(newCommitment)) {
    validateBalancesUnchanged(oldCommitment, newCommitment);
    return true;
  } else {
    return false;
  }
}

export function validateVote(oldCommitment: AppCommitment, newCommitment: AppCommitment): boolean {
  if (
    oldCommitment.appAttributes.furtherVotesRequired > 1 &&
    furtherVotesRequiredDecremented(oldCommitment, newCommitment)
  ) {
    validateBalancesUnchanged(oldCommitment, newCommitment);
    validateProposalsUnchanged(oldCommitment, newCommitment);
    return true;
  } else {
    return false;
  }
}

export function validateFinalVote(
  oldCommitment: AppCommitment,
  newCommitment: AppCommitment,
): boolean {
  if (
    oldCommitment.appAttributes.furtherVotesRequired === 1 &&
    newCommitment.appAttributes.furtherVotesRequired === 0 &&
    balancesUpdated(oldCommitment, newCommitment)
  ) {
    return true;
  } else {
    return false;
  }
}

export function validateVeto(oldCommitment: AppCommitment, newCommitment: AppCommitment): boolean {
  if (
    oldCommitment.appAttributes.furtherVotesRequired > 0 &&
    newCommitment.appAttributes.furtherVotesRequired === 0 &&
    balancesUnchanged(oldCommitment, newCommitment)
  ) {
    return true;
  } else {
    return false;
  }
}

export function validatePass(oldCommitment: AppCommitment, newCommitment: AppCommitment): boolean {
  if (
    oldCommitment.appAttributes.furtherVotesRequired === 0 &&
    newCommitment.appAttributes.furtherVotesRequired === 0
  ) {
    validateBalancesUnchanged(oldCommitment, newCommitment);
    return true;
  } else {
    return false;
  }
}

// helper validators

function validateBalancesUnchanged(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
  if (!areEqual(oldCommitment.allocation, newCommitment.allocation)) {
    throw new Error("ConsensusApp: 'allocation' must be the same between commitments.");
  }

  if (!areEqual(oldCommitment.destination, newCommitment.destination)) {
    throw new Error("ConsensusApp: 'destination' must be the same between commitments.");
  }
}

export function validateConsensusCommitment(commitment: AppCommitment): boolean {
  if (!(commitment.appAttributes.proposedAllocation.length === 0)) {
    throw new Error("ConsensusApp: 'proposedAllocation' must be reset during consensus.");
  }

  if (!(commitment.appAttributes.proposedDestination.length === 0)) {
    throw new Error("ConsensusApp: 'proposedDestination' must be reset during consensus.");
  }

  return true;
}

export function validateProposeCommitment(commitment: AppCommitment): boolean {
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

  return true;
}

function validateProposalsUnchanged(oldCommitment: AppCommitment, newCommitment: AppCommitment) {
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

// boolean helpers
function areEqual(left: string[], right: string[]) {
  // This is safe, as stringify behaves well on a flat array of strings
  return JSON.stringify(left) === JSON.stringify(right);
}

function balancesUpdated(oldCommitment: AppCommitment, newCommitment: AppCommitment): boolean {
  return (
    areEqual(oldCommitment.appAttributes.proposedAllocation, newCommitment.allocation) &&
    areEqual(oldCommitment.appAttributes.proposedDestination, newCommitment.destination)
  );
}

function balancesUnchanged(oldCommitment: AppCommitment, newCommitment: AppCommitment): boolean {
  return (
    areEqual(oldCommitment.allocation, newCommitment.allocation) &&
    areEqual(oldCommitment.destination, newCommitment.destination)
  );
}

function furtherVotesRequiredInitialized(commitment: AppCommitment): boolean {
  const numParticipants = commitment.channel.participants.length;
  return commitment.appAttributes.furtherVotesRequired === numParticipants - 1;
}

function furtherVotesRequiredDecremented(
  oldCommitment: AppCommitment,
  newCommitment: AppCommitment,
): boolean {
  return (
    newCommitment.appAttributes.furtherVotesRequired ===
    oldCommitment.appAttributes.furtherVotesRequired - 1
  );
}
