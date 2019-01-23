pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/State.sol";

library ConsensusState {
    using State for State.StateStruct;

    struct GameAttributes {
        uint256 consensusCounter;
        uint256[] proposedAllocation;
        address[] proposedDestination;
    }

    struct ConsensusStateStruct {
        uint256 numberOfParticipants;
        uint256 consensusCounter;
        uint256[] currentAllocation;
        address[] currentDestination;
        uint256[] proposedAllocation;
        address[] proposedDestination;
    }

    function gameAttributes(State.StateStruct memory frameworkState) public pure returns(GameAttributes memory) {
        return abi.decode(frameworkState.gameAttributes, (GameAttributes));
    }

    function fromFrameworkState(State.StateStruct memory frameworkState) public pure returns (ConsensusStateStruct memory) {
        GameAttributes memory gameAttributes = abi.decode(frameworkState.gameAttributes, (GameAttributes));

        return ConsensusStateStruct(
            frameworkState.numberOfParticipants,
            gameAttributes.consensusCounter,
            frameworkState.allocation,
            frameworkState.destination,
            gameAttributes.proposedAllocation,
            gameAttributes.proposedDestination
        );
    }
}