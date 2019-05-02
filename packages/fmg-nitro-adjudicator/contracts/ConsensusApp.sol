pragma solidity ^0.5.2;
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
            if (newCommitment.updateType == ConsensusCommitment.UpdateType.Accord) {
                validatePass(oldCommitment, newCommitment);
                return true;
            } else if (newCommitment.updateType == ConsensusCommitment.UpdateType.Motion) {
                validatePropose(oldCommitment, newCommitment);
                return true;
            }
        } else if (oldCommitment.updateType == ConsensusCommitment.UpdateType.Motion) {
            if (newCommitment.updateType == ConsensusCommitment.UpdateType.Motion) { 
                if (newCommitment.numVotes == 1) {
                  validateModify(oldCommitment, newCommitment);
                  return true;
                } else if (newCommitment.numVotes == oldCommitment.numVotes + 1) {
                  validateAddVote(oldCommitment, newCommitment);
                  return true;
                } else revert('ConsensusApp: numVotes must be reset to 1 (modify the proposal) or incremented (add your vote)');
            } else if (newCommitment.updateType == ConsensusCommitment.UpdateType.Accord) { 
                require(newCommitment.numVotes == 0, 'ConsensusApp: To veto or make new Accord, numVotes must be 0');
                if (encodeAndHashAllocation(newCommitment.currentAllocation) == encodeAndHashAllocation(oldCommitment.proposedAllocation) && encodeAndHashDestination(newCommitment.currentDestination) == encodeAndHashDestination(oldCommitment.proposedDestination)) {
                  validateNewAccord(oldCommitment, newCommitment);
                  return true;
                } else if (encodeAndHashAllocation(newCommitment.proposedAllocation) == encodeAndHashAllocation(oldCommitment.currentAllocation) && encodeAndHashDestination(newCommitment.proposedDestination) == encodeAndHashDestination(oldCommitment.currentDestination)) {
                  validateVeto(oldCommitment, newCommitment);
                  return true;
                } else revert('ConsensusApp: Proposed quantities must be updated to match current quantities (veto) or current quantities updated to match proposed quantitites (new accord)');
            }
        }
        revert("ConsensusApp: No valid transition found for commitments");
      }

// modifiers

    modifier currentsUnchanged(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment) {
      require(encodeAndHashAllocation(oldCommitment.currentAllocation) == encodeAndHashAllocation(newCommitment.currentAllocation), "ConsensusApp: : 'allocation' must be the same between commitments."); 
      require(encodeAndHashDestination(oldCommitment.currentDestination) == encodeAndHashDestination(newCommitment.currentDestination), "ConsensusApp:  'destination' must be the same between commitments.");
        _;
    }

    modifier proposalsUnchanged(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment) {
      require(encodeAndHashAllocation(oldCommitment.proposedAllocation) == encodeAndHashAllocation(newCommitment.proposedAllocation),"ConsensusApp:  'proposedAllocation' must be the same between commitments."); 
      require(encodeAndHashDestination(oldCommitment.proposedDestination) == encodeAndHashDestination(newCommitment.proposedDestination),"ConsensusApp:  'proposedDestination' must be the same between commitments."); 
        _;
    }

    modifier totalAllocationConserved(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment) {
      require(sum(newCommitment.proposedAllocation)==sum(oldCommitment.currentAllocation), "ConsensusApp:  allocation must be conserved");
      _;
    }
    
 // transition validations
 
    function validatePass(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    currentsUnchanged(oldCommitment, newCommitment)
    proposalsUnchanged(oldCommitment, newCommitment)
    { }

    function validatePropose(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    currentsUnchanged(oldCommitment, newCommitment)
    totalAllocationConserved(oldCommitment, newCommitment)
    { }

    function validateAddVote(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    currentsUnchanged(oldCommitment, newCommitment)
    proposalsUnchanged(oldCommitment, newCommitment)
    { }

    function validateModify(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    currentsUnchanged(oldCommitment, newCommitment)
    totalAllocationConserved(oldCommitment, newCommitment)
    { }

    function validateVeto(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    currentsUnchanged(oldCommitment, newCommitment)
    { // no additional checks necessary
    }

    function validateNewAccord(ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment, ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment)
    private
    pure
    proposalsUnchanged(oldCommitment, newCommitment)
    { }


// helpers
    function sum(uint[] memory _array) 
        public 
        pure 
        returns (uint sum_) 
    {
        sum_ = 0;
        for (uint i = 0; i < _array.length; i++) {
            sum_ += _array[i];
        }
    }

    function encodeAndHashAllocation(uint256[] memory allocation) internal pure returns (bytes32) {
        return keccak256(abi.encode(allocation));
    }

    function encodeAndHashDestination(address[] memory destination) internal pure returns (bytes32) {
        return keccak256(abi.encode(destination));
    }
}
