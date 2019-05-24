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

    // Commitment validations
    if (oldCommitment.updateType == ConsensusCommitment.UpdateType.Proposal) {
      validateProposeCommitment(oldCommitment);
    } else if (oldCommitment.updateType == ConsensusCommitment.UpdateType.Consensus) {
      validateConsensusCommitment(oldCommitment);
    }
    if (newCommitment.updateType == ConsensusCommitment.UpdateType.Proposal) {
      validateProposeCommitment(newCommitment);
    } else if (newCommitment.updateType == ConsensusCommitment.UpdateType.Consensus) {
      validateConsensusCommitment(newCommitment);
    }

    // State machine transition validations

    if (oldCommitment.updateType == ConsensusCommitment.UpdateType.Consensus) {
      if (newCommitment.updateType == ConsensusCommitment.UpdateType.Proposal) {
        validatePropose(oldCommitment, newCommitment, numParticipants);
        return true;
      }
      if (newCommitment.updateType == ConsensusCommitment.UpdateType.Consensus) {
        validatePass(oldCommitment, newCommitment);
        return true;
      }
    }
    if (oldCommitment.updateType == ConsensusCommitment.UpdateType.Proposal) {
      if (newCommitment.updateType == ConsensusCommitment.UpdateType.Proposal) {
        if (hasFurtherVotesNeededBeenInitialized(newCommitment, numParticipants)){
          validatePropose(oldCommitment, newCommitment, numParticipants);
          return true;
        } else {
          validateVote(oldCommitment, newCommitment);
          return true;
        }
      }
      if (newCommitment.updateType == ConsensusCommitment.UpdateType.Consensus) {
        if (haveBalancesBeenUpdated(oldCommitment, newCommitment)) {
          validateFinalVote(oldCommitment, newCommitment);
          return true;
        } else {
          validateVeto(oldCommitment, newCommitment);
          return true;
        }
      }
    }

    revert("ConsensusApp: No valid transition found for commitments");
  }

  // modifiers
  modifier balancesUpdated(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) {
    require(
      encodeAndHashAllocation(oldCommitment.proposedAllocation) == encodeAndHashAllocation(newCommitment.currentAllocation),
      "ConsensusApp: 'allocation' must be set to the previous `proposedAllocation`."
    ); 
    require(
      encodeAndHashDestination(oldCommitment.proposedDestination) == encodeAndHashDestination(newCommitment.currentDestination),
      "ConsensusApp: 'destination' must be set to the previous `proposedDestination`"
    );
    _;
  }

  modifier balancesUnchanged(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) {
    require(
      encodeAndHashAllocation(oldCommitment.currentAllocation) == encodeAndHashAllocation(newCommitment.currentAllocation),
      "ConsensusApp: 'allocation' must be the same between commitments."
    ); 
    require(
      encodeAndHashDestination(oldCommitment.currentDestination) == encodeAndHashDestination(newCommitment.currentDestination),
      "ConsensusApp: 'destination' must be the same between commitments."
    );
    _;
  }

  modifier proposalsUnchanged(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) {
    require(
      encodeAndHashAllocation(oldCommitment.proposedAllocation) == encodeAndHashAllocation(newCommitment.proposedAllocation),
      "ConsensusApp: 'proposedAllocation' must be the same between commitments."
    ); 
    require(
      encodeAndHashDestination(oldCommitment.proposedDestination) == encodeAndHashDestination(newCommitment.proposedDestination),
      "ConsensusApp: 'proposedDestination' must be the same between commitments."
    ); 
    _;
  }

  modifier furtherVotesRequiredInitialized(
    ConsensusCommitment.ConsensusCommitmentStruct memory commitment,
    uint numParticipants
  ) {
    require(
      commitment.furtherVotesRequired == numParticipants - 1,
      "Consensus App: furtherVotesRequired needs to be initialized to the correct value."
    ); 
    _;
  } 

  modifier furtherVotesRequiredDecremented(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) {
    require(
      newCommitment.furtherVotesRequired == oldCommitment.furtherVotesRequired - 1,
      "Consensus App: furtherVotesRequired should be decremented by 1."
    ); 
    _;
  } 

  // Commitment validations

  function validateConsensusCommitment(
    ConsensusCommitment.ConsensusCommitmentStruct memory commitment
  ) private pure {
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
  ) private pure {
    require(
      commitment.furtherVotesRequired != 0,
      "ConsensusApp: 'furtherVotesRequired' must not be 0 during propose."
      ); 
    require(
      commitment.proposedAllocation.length > 0,
      "ConsensusApp: 'proposedAllocation' must not be empty during propose."
      ); 
    require(
      commitment.proposedDestination.length == commitment.proposedAllocation.length,
      "ConsensusApp: 'proposedDestination' and 'proposedAllocation' must be the same length during propose."
    ); 
  } 

// Transition validations

  function validatePass(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) private pure
    balancesUnchanged(oldCommitment, newCommitment)
    proposalsUnchanged(oldCommitment, newCommitment)
  { }

  function validatePropose(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment,
    uint numParticipants
  ) private pure
    balancesUnchanged(oldCommitment, newCommitment)
    furtherVotesRequiredInitialized(newCommitment, numParticipants)
  { }

  function validateFinalVote(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) private pure
    balancesUpdated(oldCommitment, newCommitment)
  { }
    
  function validateVeto(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) private pure
    balancesUnchanged(oldCommitment, newCommitment)
  { }

  function validateVote(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) private pure
    balancesUnchanged(oldCommitment, newCommitment)
    proposalsUnchanged(oldCommitment, newCommitment)
    furtherVotesRequiredDecremented(oldCommitment, newCommitment)
  { }

 

// helpers

  function haveBalancesBeenUpdated(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) public pure returns (bool) {
    return encodeAndHashAllocation(oldCommitment.proposedAllocation) == encodeAndHashAllocation(newCommitment.currentAllocation) &&
    encodeAndHashDestination(oldCommitment.proposedDestination) == encodeAndHashDestination(newCommitment.currentDestination);   
  }

  function hasFurtherVotesNeededBeenInitialized(
      ConsensusCommitment.ConsensusCommitmentStruct memory commitment,
      uint numParticipants
  ) public pure returns (bool)
  {
    return commitment.furtherVotesRequired == numParticipants - 1;
  }

  function encodeAndHashAllocation(uint256[] memory allocation) internal pure returns (bytes32) {
    return keccak256(abi.encode(allocation));
  }

  function encodeAndHashDestination(address[] memory destination) internal pure returns (bytes32) {
    return keccak256(abi.encode(destination));
  }
}
