pragma solidity ^0.4.18;

import './CommonState.sol';

library CountingState {
    // CountingGame State Fields
    // (relative to gamestate offset)
    // ==============================
    // [  0 -  31] uint256 aBal
    // [ 32 -  63] uint256 bBal
    // [ 64 -  95] uint256 count

    function aBal(bytes _state) public pure returns (uint256 _aBal) {
        uint offset = CommonState.gameStateOffset(_state);
        assembly {
            _aBal := mload(add(_state, offset))
        }
    }

    function bBal(bytes _state) public pure returns (uint256 _bBal) {
        uint offset = CommonState.gameStateOffset(_state) + 32;
        assembly {
            _bBal := mload(add(_state, offset))
        }
    }

    function count(bytes _state) public pure returns (uint256 _count) {
        uint offset = CommonState.gameStateOffset(_state) + 64;
        assembly {
            _count := mload(add(_state, offset))
        }
    }
}
