pragma solidity ^0.4.18;

import './CommonState.sol';

library RockPaperScissorsState {
  enum StateType { Start, RoundProposed, RoundAccepted, Reveal, Final }
  enum Play { Rock, Paper, Scissors }

  // RockPaperScissors State Fields
  // (relative to gamestate offset)
  // ==============================
  // [  0 -  31] enum stateType
  // [ 32 -  63] uint256 aBal
  // [ 64 -  95] uint256 bBal
  // [ 96 - 127] uint256 stake
  // [128 - 159] bytes32 preCommit
  // [160 - 191] enum bPlay
  // [192 - 223] enum aPlay
  // [224 - 255] bytes32 salt

  function stateType(bytes _state) public pure returns (StateType _stateType) {
    uint offset = CommonState.gameStateOffset(_state);
    assembly {
      _stateType := mload(add(_state, offset))
    }
  }

  function aBal(bytes _state) public pure returns (uint256 _aBal) {
    uint offset = CommonState.gameStateOffset(_state) + 32;
    assembly {
      _aBal := mload(add(_state, offset))
    }
  }

  function bBal(bytes _state) public pure returns (uint256 _bBal) {
    uint offset = CommonState.gameStateOffset(_state) + 64;
    assembly {
      _bBal := mload(add(_state, offset))
    }
  }

  function stake(bytes _state) public pure returns (uint256 _stake) {
    uint offset = CommonState.gameStateOffset(_state) + 96;
    assembly {
      _stake := mload(add(_state, offset))
    }
  }
  function preCommit(bytes _state) public pure returns (bytes32 _preCommit) {
    uint offset = CommonState.gameStateOffset(_state) + 128;
    assembly {
      _preCommit := mload(add(_state, offset))
    }
  }

  function bPlay(bytes _state) public pure returns (Play _aPlay) {
    uint offset = CommonState.gameStateOffset(_state) + 160;
    assembly {
      _aPlay := mload(add(_state, offset))
    }
  }

  function aPlay(bytes _state) public pure returns (Play _bPlay) {
    uint offset = CommonState.gameStateOffset(_state) + 192;
    assembly {
      _bPlay := mload(add(_state, offset))
    }
  }

  function salt(bytes _state) public pure returns (bytes32 _salt) {
    uint offset = CommonState.gameStateOffset(_state) + 224;
    assembly {
      _salt := mload(add(_state, offset))
    }
  }
}
