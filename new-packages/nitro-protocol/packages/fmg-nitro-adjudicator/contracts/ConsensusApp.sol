pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/Commitment.sol";
import "./ConsensusCommitment.sol";

contract ConsensusApp {
  using ConsensusCommitment for ConsensusCommitment.ConsensusCommitmentStruct;

  function validTransition(
    Commitment.CommitmentStruct memory _old,
    Commitment.CommitmentStruct memory _new
  ) public pure returns (bool) {

    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment = ConsensusCommitment.fromFrameworkCommitment(_old);
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment = ConsensusCommitment.fromFrameworkCommitment(_new);
    uint numParticipants = _old.participants.length;

    if (oldCommitment.furtherVotesRequired == 0) {
      validateConsensusCommitment(oldCommitment);
    } else {
      validateProposeCommitment(oldCommitment);
    }

    if (newCommitment.furtherVotesRequired == 0) {
      validateConsensusCommitment(newCommitment);
    } else {
      validateProposeCommitment(newCommitment);
    }

    return validPropose(oldCommitment, newCommitment, numParticipants)   ||
           validVote(oldCommitment, newCommitment) ||
           validVeto(oldCommitment, newCommitment) ||
           validPass(oldCommitment, newCommitment) ||
           validFinalVote(oldCommitment, newCommitment) ||
           invalidTransition();
  }

  function invalidTransition() internal pure returns (bool) {
    revert("ConsensusApp: No valid transition found for commitments");
  }

  // Transition validations

  function validPropose(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment,
    uint numParticipants
  ) internal pure returns (bool)
  {
    if (
      furtherVotesRequiredInitialized(newCommitment, numParticipants)
    ) {
      validateBalancesUnchanged(oldCommitment, newCommitment);
      return true;
    } else {
      return false;
    }
  }

  function validVote(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) internal pure returns (bool)
  {
    if (
      oldCommitment.furtherVotesRequired > 1 &&
      furtherVotesRequiredDecremented(oldCommitment, newCommitment)
    ) {
      validateBalancesUnchanged(oldCommitment, newCommitment);
      validateProposalsUnchanged(oldCommitment, newCommitment);
      return true;
    } else {
      return false;
    }
  }

  function validFinalVote(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) internal pure returns (bool)
  {
    if (
      oldCommitment.furtherVotesRequired == 1 &&
      newCommitment.furtherVotesRequired == 0 &&
      balancesUpdated(oldCommitment, newCommitment)
    ) {
      return true;
    } else {
      return false;
    }
  }

  function validVeto(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) internal pure returns (bool)
  {
    if (
      oldCommitment.furtherVotesRequired > 0 &&
      newCommitment.furtherVotesRequired == 0 &&
      balancesUnchanged(oldCommitment, newCommitment)
    ) {
      return true;
    } else {
      return false;
    }
  }

  function validPass(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) internal pure returns (bool)
  {
    if (
      oldCommitment.furtherVotesRequired == 0 &&
      newCommitment.furtherVotesRequired == 0
    ) {
      validateBalancesUnchanged(oldCommitment, newCommitment);
      return true;
    } else {
      return false;
    }
  }

  // Helper validators

  function validateBalancesUnchanged(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) private pure {
    require(
      encodeAndHashAllocation(oldCommitment.currentAllocation) == encodeAndHashAllocation(newCommitment.currentAllocation),
      "ConsensusApp: 'allocation' must be the same between commitments."
    );
    require(
      encodeAndHashDestination(oldCommitment.currentDestination) == encodeAndHashDestination(newCommitment.currentDestination),
      "ConsensusApp: 'destination' must be the same between commitments."
    );
  }

  function validateProposalsUnchanged(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) private pure {
    require(
      encodeAndHashAllocation(oldCommitment.proposedAllocation) == encodeAndHashAllocation(newCommitment.proposedAllocation),
      "ConsensusApp: 'proposedAllocation' must be the same between commitments."
    );
    require(
      encodeAndHashDestination(oldCommitment.proposedDestination) == encodeAndHashDestination(newCommitment.proposedDestination),
      "ConsensusApp: 'proposedDestination' must be the same between commitments."
    );
  }

  function validateConsensusCommitment(
    ConsensusCommitment.ConsensusCommitmentStruct memory commitment
  ) internal pure {
    require(
      commitment.furtherVotesRequired == 0,
      "ConsensusApp: 'furtherVotesRequired' must be 0 during consensus."
      );
    require(
      commitment.proposedAllocation.length == 0,
      "ConsensusApp: 'proposedAllocation' must be reset during consensus."
      );
    require(
      commitment.proposedDestination.length == 0,
      "ConsensusApp: 'proposedDestination' must be reset during consensus."
    );
  }

  function validateProposeCommitment(
    ConsensusCommitment.ConsensusCommitmentStruct memory commitment
  ) internal pure {
    require(
      commitment.furtherVotesRequired != 0,
      "ConsensusApp: 'furtherVotesRequired' must not be 0 during propose."
      );
    require(
      commitment.proposedDestination.length > 0,
      "ConsensusApp: 'proposedDestination' must not be reset during propose."
      );
    require(
      commitment.proposedAllocation.length == 0 || // in case it's a guarantor channel
      commitment.proposedAllocation.length == commitment.proposedDestination.length,
      "ConsensusApp: Outcome must be valid during propose"
    );
  }

  // Booleans

  function furtherVotesRequiredInitialized(
    ConsensusCommitment.ConsensusCommitmentStruct memory commitment,
    uint numParticipants
  ) private pure returns (bool) {
    return(
      commitment.furtherVotesRequired == numParticipants - 1
    );
  }

  function furtherVotesRequiredDecremented(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) private pure returns (bool) {
    return(
      newCommitment.furtherVotesRequired == oldCommitment.furtherVotesRequired - 1
    );
  }

  function balancesUpdated(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) private pure returns (bool) {
    return (
      encodeAndHashAllocation(oldCommitment.proposedAllocation) == encodeAndHashAllocation(newCommitment.currentAllocation) &&
      encodeAndHashDestination(oldCommitment.proposedDestination) == encodeAndHashDestination(newCommitment.currentDestination)
    );
  }

  function balancesUnchanged(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) private pure returns (bool) {
    return (
      encodeAndHashAllocation(oldCommitment.currentAllocation) == encodeAndHashAllocation(newCommitment.currentAllocation) &&
      encodeAndHashDestination(oldCommitment.currentDestination) == encodeAndHashDestination(newCommitment.currentDestination)
    );
  }

  function hasFurtherVotesNeededBeenInitialized(
      ConsensusCommitment.ConsensusCommitmentStruct memory commitment,
      uint numParticipants
  ) public pure returns (bool) {
    return commitment.furtherVotesRequired == numParticipants - 1;
  }

  // helpers

  function encodeAndHashAllocation(uint256[] memory allocation) internal pure returns (bytes32) {
    return keccak256(abi.encode(allocation));
  }

  function encodeAndHashDestination(address[] memory destination) internal pure returns (bytes32) {
    return keccak256(abi.encode(destination));
  }
}
