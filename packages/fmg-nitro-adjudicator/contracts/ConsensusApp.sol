pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/Commitment.sol";
import "./ConsensusCommitment.sol";

contract ConsensusApp {
    using ConsensusCommitment for ConsensusCommitment.ConsensusCommitmentStruct;

    function validTransition(Commitment.CommitmentStruct memory _old, Commitment.CommitmentStruct memory _new) public pure returns (bool) {

        ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment = ConsensusCommitment.fromFrameworkCommitment(_old);
        ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment = ConsensusCommitment.fromFrameworkCommitment(_new);

        uint numParticipants = _old.participants.length;

// State machine transition identifier

        if (oldCommitment.updateType == ConsensusCommitment.UpdateType.Accord) {
            if (newCommitment.UpdateType == ConsensusCommitment.UpdateType.Accord) {
                validatePass(oldCommitment, newCommitment);
                return true;
            } else if (newCommitment.UpdateType == ConsensusCommitment.UpdateType.Motion) {
                validatePropose(oldCommitment, newCommitment);
                return true;
            }
        } else if (oldCommitment.UpdateType == ConsensusCommitment.UpdateType.Motion) {
            if (newCommitment.UpdateType == ConsensusCommitment.UpdateType.Motion) { 
                if (newCommitment.numVotes == 1) {
                  validateModify(oldCommitment, newCommitment);
                  return true;
                } else if (newCommitment.numVotes == oldCommitment.numVotes + 1) {
                  validateAddVote(oldCommitment, newCommitment);
                  return true;
                } else revert('ConsensusApp: numVotes must be reset to 1 (modify the proposal) or incremented (add your vote)');
            } else if (newCommitment.UpdateType == ConsensusCommitment.UpdateType.Accord) { 
                require(newCommitment.numVotes == 0, 'ConsensusApp: To veto or make new Accord, numVotes must be 0');
                if (newCommitment.allocation == oldCommitment.proposedAllocation && newCommitment.destination == oldCommitment.proposedDestination ) {
                  validateNewAccord(oldCommitment, newCommitment);
                  return true;
                } else if (newCommitment.proposedAllocation == oldCommitment.allocation && newCommitment.proposedDestination == oldCommitment.destination) {
                  validateVeto(oldCommitment, newCommitment);
                  return true;
                } else revert('ConsensusApp: Proposed quantities must be updated to match actual quantities (veto) or actual quantities updated to match proposed quantitites (new accord)');
            }
        }
        revert("ConsensusApp: No valid transition found for commitments");
      }

// modifiers

    modifier actualsUnchanged(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment) {
      require(oldCommitment.allocation == newCommitment.allocation,"ConsensusApp: : 'allocation' must be the same between commitments."); 
      require(oldCommitment.destination == newCommitment.destination,"ConsensusApp:  'destination' must be the same between commitments."); 
        _;
    }

    modifier proposalsUnchanged(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment) {
      require(oldCommitment.proposedAllocation == newCommitment.proposedAllocation,"ConsensusApp:  'proposedAllocation' must be the same between commitments."); 
      require(oldCommitment.proposedDestination == newCommitment.proposedDestination,"ConsensusApp:  'proposedDestination' must be the same between commitments."); 
        _;
    }

    modifier totalAllocationConserved(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment) {
      require(sum(newCommitment.proposedAllocation)==sum(oldCommitment.allocation), "ConsensusApp:  allocation must be conserved");
      _;
    }
    
 // transition validations
 
    function validatePass(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    actualsUnchanged(oldCommitment, newCommitment)
    proposalsUnchanged(oldCommitment, newCommitment)
    { }

    function validatePropose(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    actualsUnchanged(oldCommitment, newCommitment)
    totalAllocationConserved(oldCommitment, newCommitment)
    { }

    function validateAddVote(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    actualsUnchanged(oldCommitment, newCommitment)
    proposalsUnchanged(oldCommitment, newCommitment)
    { }

    function validateModify(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    actualsUnchanged(oldCommitment, newCommitment)
    totalAllocationConserved(oldCommitment, newCommitment)
    { }

    function validateVeto(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    actualsUnchanged(oldCommitment, newCommitment)
    { // no additional checks necessary
    }

    function validateNewAccord(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    proposalsUnchanged(oldCommitment, newCommitment)
    { }

}