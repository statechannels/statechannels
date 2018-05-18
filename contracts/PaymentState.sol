pragma solidity ^0.4.18;

import './CommonState.sol';

library PaymentState {
  enum PositionType { Transacting, Concluded }

  // PaymentGame State Fields
  // (relative to gamestate offset)
  // ==============================
  // [  0 -  31] enum positionType
  // [ 32 -  63] uint256 aBal
  // [ 64 -  95] uint256 bBal

  function positionType(bytes _state) public pure returns (PositionType _positionType) {
    uint offset = CommonState.gameStateOffset(_state);
    assembly {
      _positionType := mload(add(_state, offset))
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
}
