pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../../State.sol";
import "../CountingState.sol";

contract TestCountingState {
    using State for State.StateStruct;
    using CountingState for CountingState.CountingStateStruct;

    function fromFrameworkState(State.StateStruct memory frameworkState) public pure returns (CountingState.CountingStateStruct memory) {
        return CountingState.fromFrameworkState(frameworkState);
    }
}
