pragma solidity ^0.4.18;

contract IncrementationGame {
  enum StateType { Start, Final }

  struct State {
    StateType stateType;
    uint256 aBal;
    uint256 bBal;
    uint256 points;
  }

  // The following transitions are allowed:
  //
  // Start -> Final
  //
  function validTransition(bytes _old, bytes _new) public pure returns (bool) {
    State memory oldState = unpack(_old); // inefficient to do all the unpacking upfront, but ok for now
    State memory newState = unpack(_new);

    if (oldState.stateType == StateType.Start) {
      // regardless of whether we move to a Start or Final state, we must have:
      // 1. balances remain the same
      // 2. points must increase
      require(newState.aBal == oldState.aBal);
      require(newState.bBal == oldState.bBal);
      require(newState.points == oldState.points + 1);

      return true;
    }

    revert();
  }

  // in this case the resolution function is pure, but it doesn't have to be in general
  function resolve(bytes _state) public pure returns (uint aBal, uint bBal) {
    State memory state = unpack(_state);

    aBal = state.aBal;
    bBal = state.bBal;
  }

  function unpack(bytes _state) private pure returns (State) {
    StateType stateType;
    uint256 aBal;
    uint256 bBal;
    uint256 points;

    assembly {
      stateType := mload(add(_state, 32))
      aBal := mload(add(_state, 64))
      bBal := mload(add(_state, 96))
      points := mload(add(_state, 128))
    }

    return State(stateType, aBal, bBal, points);
  }
}
