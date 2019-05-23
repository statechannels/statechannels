import { AppCommitment, isConsensusReached, isProposal } from './consensus-app';
export function validTransition(fromCommitment: AppCommitment, toCommitment: AppCommitment): true {
  // State; machine; transition; identifier;
  if (isConsensusReached(fromCommitment)) {
    if (isProposal(toCommitment)) {
      validatePropose(fromCommitment, toCommitment);
      return true;
    }
    if (isConsensusReached(toCommitment)) {
      validatePass(fromCommitment, toCommitment);
      return true;
    }
  }
  if (isProposal(fromCommitment)) {
    if (isProposal(toCommitment)) {
      if (hasFurtherVotesNeededBeenInitialized(toCommitment)) {
        validatePropose(fromCommitment, toCommitment);
        return true;
      } else {
        validateVote(fromCommitment, toCommitment);
        return true;
      }
    }
    if (isConsensusReached(toCommitment)) {
      if (haveBalancesBeenUpdated(fromCommitment, toCommitment)) {
        validateFinalVote(fromCommitment, toCommitment);
        return true;
      } else {
        validateVeto(fromCommitment, toCommitment);
        return true;
      }
    }
  }
  throw new Error('ConsensusApp: No valid transition found for commitments');
}

function validatePass(fromCommitment: AppCommitment, toCommitment: AppCommitment) {
  balancesUnchanged(fromCommitment, toCommitment);
  proposalsUnchanged(fromCommitment, toCommitment);
}
function validatePropose(fromCommitment: AppCommitment, toCommitment: AppCommitment) {
  balancesUnchanged(fromCommitment, toCommitment);
  furtherVotesRequiredInitialized(toCommitment);
}
function validateFinalVote(fromCommitment: AppCommitment, toCommitment: AppCommitment) {
  validConsensusState(toCommitment);
  balancesUpdated(fromCommitment, toCommitment);
}
function validateVeto(fromCommitment: AppCommitment, toCommitment: AppCommitment) {
  balancesUnchanged(fromCommitment, toCommitment);
  validConsensusState(toCommitment);
}
function validateVote(fromCommitment: AppCommitment, toCommitment: AppCommitment) {
  balancesUnchanged(fromCommitment, toCommitment);
  proposalsUnchanged(fromCommitment, toCommitment);
  furtherVotesRequiredDecremented(fromCommitment, toCommitment);
}

// helpers
function areEqual(left: string[], right: string[]) {
  // This is safe, as stringify behaves well on a flat array of strings
  return JSON.stringify(left) === JSON.stringify(right);
}
function haveBalancesBeenUpdated(fromCommitment: AppCommitment, toCommitment: AppCommitment) {
  return (
    areEqual(fromCommitment.appAttributes.proposedAllocation, toCommitment.allocation) &&
    areEqual(fromCommitment.appAttributes.proposedDestination, toCommitment.destination)
  );
}
function hasFurtherVotesNeededBeenInitialized(commitment: AppCommitment): boolean {
  const numParticipants = commitment.channel.participants.length;
  return commitment.appAttributes.furtherVotesRequired === numParticipants - 1;
}

function balancesUpdated(fromCommitment: AppCommitment, toCommitment: AppCommitment) {
  if (!areEqual(fromCommitment.appAttributes.proposedAllocation, toCommitment.allocation)) {
    throw new Error("ConsensusApp: 'allocation' must be set to the previous `proposedAllocation`.");
  }

  if (!areEqual(fromCommitment.appAttributes.proposedDestination, toCommitment.destination)) {
    throw new Error(
      "ConsensusApp: 'destination' must be set to the previous `proposedDestination`",
    );
  }
}
function balancesUnchanged(fromCommitment: AppCommitment, toCommitment: AppCommitment) {
  if (!areEqual(fromCommitment.allocation, toCommitment.allocation)) {
    throw new Error("ConsensusApp: 'allocation' must be the same between commitments.");
  }

  if (!areEqual(fromCommitment.destination, toCommitment.destination)) {
    throw new Error("ConsensusApp: 'destination' must be the same between commitments.");
  }
}
function proposalsUnchanged(fromCommitment: AppCommitment, toCommitment: AppCommitment) {
  if (
    !areEqual(
      fromCommitment.appAttributes.proposedAllocation,
      toCommitment.appAttributes.proposedAllocation,
    )
  ) {
    throw new Error("ConsensusApp: 'proposedAllocation' must be the same between commitments.");
  }
  if (
    !areEqual(
      fromCommitment.appAttributes.proposedDestination,
      toCommitment.appAttributes.proposedDestination,
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
  fromCommitment: AppCommitment,
  toCommitment: AppCommitment,
) {
  if (
    !(
      toCommitment.appAttributes.furtherVotesRequired ===
      fromCommitment.appAttributes.furtherVotesRequired - 1
    )
  ) {
    throw new Error('Consensus App: furtherVotesRequired should be decremented by 1.');
  }
}
function validConsensusState(commitment: AppCommitment) {
  if (!(commitment.appAttributes.proposedAllocation.length === 0)) {
    throw new Error("ConsensusApp: 'proposedAllocation' must be reset during consensus.");
  }

  if (!(commitment.appAttributes.proposedDestination.length === 0)) {
    throw new Error("ConsensusApp: 'proposedDestination' must be reset during consensus.");
  }
}
