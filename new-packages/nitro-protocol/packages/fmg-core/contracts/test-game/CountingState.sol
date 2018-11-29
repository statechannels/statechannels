pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../State.sol";

library CountingState {
    using State for State.StateStruct;

    struct CountingStateStruct {
        uint256 gameCounter;
        State.StateStruct frameworkState;
    }
}
