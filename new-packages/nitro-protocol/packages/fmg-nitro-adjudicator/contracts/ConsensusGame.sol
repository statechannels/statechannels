pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/State.sol";
import "./ConsensusState.sol";

contract ConsensusGame {
    using ConsensusState for ConsensusState.ConsensusStateStruct;

    function validTransition(State.StateStruct memory _old, State.StateStruct memory _new) public pure returns (bool) {

        ConsensusState.ConsensusStateStruct memory oldState = ConsensusState.fromFrameworkState(_old);
        ConsensusState.ConsensusStateStruct memory newState = ConsensusState.fromFrameworkState(_new);

        require(
            newState.proposedAllocation.length == newState.proposedDestination.length,
            'ConsensusGame: newState.proposedAllocation.length must match newState.proposedDestination.length'
        );

        // \begin{align*}
        //     t_{L_C}(i, \beta, (j, x), \beta', (j', x')) \Leftrightarrow
        //         [ & (j=n-1 \wedge j'= 0 \wedge \beta' = x = x')  \vee \\
        //         & (j < n-1 \wedge j' = j+1, \beta = \beta', x = x') \vee \\
        //         & (j'=0, \beta = \beta') ]
        // \end{align*}
        uint numParticipants = oldState.numberOfParticipants;
        if (oldState.consensusCounter == numParticipants - 1) {
            require(
                newState.consensusCounter == 0,
                "ConsensusGame: consensus counter must be reset at the end of the consensus round"
            );
            require(
              hashedAllocation(newState.currentAllocation) == hashedAllocation(newState.proposedAllocation) && hashedAllocation(oldState.proposedAllocation) == hashedAllocation(newState.proposedAllocation),
              "ConsensusGame: newState.currentAllocation must match newState.proposedAllocation at the end of the consensus round"
            );
            require(
              hashedDestination(newState.currentDestination) == hashedDestination(newState.proposedDestination) && hashedDestination(oldState.proposedDestination) == hashedDestination(newState.proposedDestination),
              "ConsensusGame: newState.currentDestination must match newState.proposedDestination at the end of the consensus round"
            );

            return true;

        } else if (oldState.consensusCounter < numParticipants - 1 && newState.consensusCounter == oldState.consensusCounter + 1) {
            require(
              hashedAllocation(oldState.currentAllocation) == hashedAllocation(newState.currentAllocation),
              "ConsensusGame: currentAllocations must match during consensus round"
            );
            require(
              hashedDestination(oldState.currentDestination) == hashedDestination(newState.currentDestination),
              "ConsensusGame: currentDestinations must match during consensus round"
            );
            require(
              hashedAllocation(oldState.proposedAllocation) == hashedAllocation(newState.proposedAllocation),
              "ConsensusGame: proposedAllocations must match during consensus round"
            );
            require(
              hashedDestination(oldState.proposedDestination) == hashedDestination(newState.proposedDestination),
              "ConsensusGame: proposedDestinations must match during consensus round"
            );

            return true;

        } else if (newState.consensusCounter == 0) {
            require(
                hashedAllocation(oldState.currentAllocation) == hashedAllocation(newState.currentAllocation),
                "CountingGame: currentAllocations must be equal when resetting the consensusCounter before the end of the round"
            );
            require(
                hashedDestination(oldState.currentDestination) == hashedDestination(newState.currentDestination),
                "CountingGame: currentDestinations must be equal when resetting the consensusCounter before the end of the round"
            );
            return true;
        }

        revert('ConsensusGame: Invalid input -- consensus counters out of range');
    }

    function hashedAllocation(uint256[] memory allocation) internal pure returns (bytes32) {
        return keccak256(abi.encode(allocation));
    }

    function hashedDestination(address[] memory destination) internal pure returns (bytes32) {
        return keccak256(abi.encode(destination));
    }
}