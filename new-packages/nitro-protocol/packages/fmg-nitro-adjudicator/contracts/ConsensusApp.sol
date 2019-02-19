pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/Commitment.sol";
import "./ConsensusCommitment.sol";

contract ConsensusApp {
    using ConsensusCommitment for ConsensusCommitment.ConsensusCommitmentStruct;

    function validTransition(Commitment.CommitmentStruct memory _old, Commitment.CommitmentStruct memory _new) public pure returns (bool) {

        ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment = ConsensusCommitment.fromFrameworkCommitment(_old);
        ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment = ConsensusCommitment.fromFrameworkCommitment(_new);

        uint numParticipants = oldCommitment.numberOfParticipants;
        if (oldCommitment.consensusCounter == numParticipants - 1) {
            require(
                newCommitment.consensusCounter == 0,
                "ConsensusApp: consensus counter must be reset at the end of the consensus round"
            );
            require(
              hashedAllocation(newCommitment.currentAllocation) == hashedAllocation(newCommitment.proposedAllocation) && hashedAllocation(oldCommitment.proposedAllocation) == hashedAllocation(newCommitment.proposedAllocation),
              "ConsensusApp: newCommitment.currentAllocation must match newCommitment.proposedAllocation at the end of the consensus round"
            );
            require(
              hashedDestination(newCommitment.currentDestination) == hashedDestination(newCommitment.proposedDestination) && hashedDestination(oldCommitment.proposedDestination) == hashedDestination(newCommitment.proposedDestination),
              "ConsensusApp: newCommitment.currentDestination must match newCommitment.proposedDestination at the end of the consensus round"
            );

            return true;

        } else if (oldCommitment.consensusCounter < numParticipants - 1 && newCommitment.consensusCounter == oldCommitment.consensusCounter + 1) {
            require(
              hashedAllocation(oldCommitment.currentAllocation) == hashedAllocation(newCommitment.currentAllocation),
              "ConsensusApp: currentAllocations must match during consensus round"
            );
            require(
              hashedDestination(oldCommitment.currentDestination) == hashedDestination(newCommitment.currentDestination),
              "ConsensusApp: currentDestinations must match during consensus round"
            );
            require(
              hashedAllocation(oldCommitment.proposedAllocation) == hashedAllocation(newCommitment.proposedAllocation),
              "ConsensusApp: proposedAllocations must match during consensus round"
            );
            require(
              hashedDestination(oldCommitment.proposedDestination) == hashedDestination(newCommitment.proposedDestination),
              "ConsensusApp: proposedDestinations must match during consensus round"
            );

            return true;

        } else if (newCommitment.consensusCounter == 0) {
            require(
                hashedAllocation(oldCommitment.currentAllocation) == hashedAllocation(newCommitment.currentAllocation),
                "CountingApp: currentAllocations must be equal when resetting the consensusCounter before the end of the round"
            );
            require(
                hashedDestination(oldCommitment.currentDestination) == hashedDestination(newCommitment.currentDestination),
                "CountingApp: currentDestinations must be equal when resetting the consensusCounter before the end of the round"
            );
            return true;
        }

        revert('ConsensusApp: Invalid input -- consensus counters out of range');
    }

    function hashedAllocation(uint256[] memory allocation) internal pure returns (bytes32) {
        return keccak256(abi.encode(allocation));
    }

    function hashedDestination(address[] memory destination) internal pure returns (bytes32) {
        return keccak256(abi.encode(destination));
    }
}