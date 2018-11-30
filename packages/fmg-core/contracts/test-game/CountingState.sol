pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../State.sol";

library CountingState {
    using State for State.StateStruct;

    struct GameAttributes {
        uint256 gameCounter;
    }

    struct CountingStateStruct {
        uint256 gameCounter;
        uint256[] resolution;
    }

    function fromFrameworkState(State.StateStruct memory frameworkState) public pure returns (CountingStateStruct memory) {
        GameAttributes memory gameAttributes = abi.decode(frameworkState.gameAttributes, (GameAttributes));

        return CountingStateStruct(gameAttributes.gameCounter, frameworkState.resolution);
    }
}
