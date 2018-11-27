pragma solidity ^0.5.0;

import "../State.sol";

library CountingState {
    // CountingGame State Fields
    // (relative to gamestate offset)
    // ==============================
    // [  0 -  31] uint256 count

    function count(bytes _state) public pure returns (uint256 _count) {
        uint offset = State.gameStateOffset(_state);
        assembly {
            _count := mload(add(_state, offset))
        }
    }

    // utility functions
    function aBal(bytes _state) public pure returns (uint256) {
        return State.resolution(_state)[0];
    }

    function bBal(bytes _state) public pure returns (uint256 _bBal) {
        return State.resolution(_state)[1];
    }
}
