pragma solidity ^0.4.18;

contract StartFinishGame {
  enum StateType { Start, Final }

  struct State {
    StateType stateType;
    uint256 aBal;
    uint256 bBal;
  }

  // The following transitions are allowed:
  //
  // Start -> Final
  //
  function validTransition(bytes _old, bytes _new) public pure returns (bool) {
    State memory oldState = unpack(_old); // inefficient to do all the unpacking upfront, but ok for now
    State memory newState = unpack(_new);

    if (oldState.stateType == StateType.Start) {
      require(newState.stateType == StateType.Final);
      require(newState.aBal == oldState.aBal);
      require(newState.bBal == oldState.bBal);
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

    assembly {
      stateType := mload(add(_state, 32))
      aBal := mload(add(_state, 64))
      bBal := mload(add(_state, 96))
    }

    return State(stateType, aBal, bBal);
  }
}
