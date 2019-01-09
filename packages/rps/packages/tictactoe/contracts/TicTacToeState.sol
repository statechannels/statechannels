pragma solidity ^0.4.18;

import "fmg-core/contracts/State.sol"; // TODO ensure the fmg-core is reflected in a package.json

library TicTacToeState {
    enum PositionType { Rest, Xplaying, Oplaying, Victory, Draw } 
    
    // TicTacToe State Fields
    // (relative to gamestate offset) <- GK / this is because the gamestate is appended to the full state of the channel, which has things like turnNum in it
    // ==============================
    // [  0 -  31] enum positionType
    // [ 32 -  63] uint256 stake
    // [ 64 -  95] uint16 noughts
    // [ 96 - 127] uint16 crosses

    function positionType(bytes _state) public pure returns (PositionType _positionType) {
        uint offset = State.gameStateOffset(_state);
        assembly {
            _positionType := mload(add(_state, offset))
        }
    }

    function stake(bytes _state) public pure returns (uint256 _stake) {
        uint offset = State.gameStateOffset(_state) + 32;
        assembly {
            _stake := mload(add(_state, offset))
        }
    }

    function noughts(bytes _state) public pure returns (uint16 _noughts) {
        uint offset = State.gameStateOffset(_state) + 64;
        assembly {
            _noughts := mload(add(_state, offset))
        }
    }

    function crosses(bytes _state) public pure returns (uint16 _crosses) {
        uint offset = State.gameStateOffset(_state) + 96;
        assembly {
            _crosses := mload(add(_state, offset))
        }
    }

    // utility functions
    function aResolution(bytes _state) public pure returns (uint256 _aBal) {
        return State.resolution(_state)[0];
    }

    function bResolution(bytes _state) public pure returns (uint256 _bBal) {
        return State.resolution(_state)[1];
    }
}
