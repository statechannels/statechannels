pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;


import "../State.sol";

library CountingState {
    struct CountingStateStruct {
        uint256 count;
        State.StateStruct baseState;
    }

    // utility functions
    function aBal(CountingStateStruct memory _state) public pure returns (uint256) {
        return _state.baseState.resolution[0];
    }

    function bBal(CountingStateStruct memory _state) public pure returns (uint256) {
        return _state.baseState.resolution[1];
    }
}
