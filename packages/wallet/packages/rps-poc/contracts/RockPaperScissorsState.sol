pragma solidity ^0.4.18;

import "fmg-core/contracts/State.sol";

library RockPaperScissorsState {
    enum PositionType { Start, RoundProposed, RoundAccepted, Reveal, Concluded }
    enum Play { Rock, Paper, Scissors }

    // RockPaperScissors State Fields
    // (relative to gamestate offset)
    // ==============================
    // [  0 -  31] enum positionType
    // [ 32 -  63] uint256 stake
    // [ 64 -  95] bytes32 preCommit
    // [ 96 - 127] enum bPlay
    // [128 - 159] enum aPlay
    // [160 - 191] bytes32 salt
    // [192 - 223] uint256 roundNum

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

    function preCommit(bytes _state) public pure returns (bytes32 _preCommit) {
        uint offset = State.gameStateOffset(_state) + 64;
        assembly {
            _preCommit := mload(add(_state, offset))
        }
    }

    function bPlay(bytes _state) public pure returns (Play _aPlay) {
        uint offset = State.gameStateOffset(_state) + 96;
        assembly {
            _aPlay := mload(add(_state, offset))
        }
    }

    function aPlay(bytes _state) public pure returns (Play _bPlay) {
        uint offset = State.gameStateOffset(_state) + 128;
        assembly {
            _bPlay := mload(add(_state, offset))
        }
    }

    function salt(bytes _state) public pure returns (bytes32 _salt) {
        uint offset = State.gameStateOffset(_state) + 160;
        assembly {
            _salt := mload(add(_state, offset))
        }
    }

    function roundNum(bytes _state) public pure returns (uint256 _roundNum) {
        uint offset = State.gameStateOffset(_state) + 192;
        assembly {
            _roundNum := mload(add(_state, offset))
        }
    }

    // utility functions
    function aResolution(bytes _state) public pure returns (uint256) {
        return State.resolution(_state)[0];
    }

    function bResolution(bytes _state) public pure returns (uint256 _bBal) {
        return State.resolution(_state)[1];
    }
}
