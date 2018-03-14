pragma solidity ^0.4.18;

contract PaymentGame {
  enum StateType { ANext, BNext, Final }

  struct State {
    StateType stateType;
    uint256 aBal;
    uint256 bBal;
    uint256 stake;
    bytes32 aPreCommit;
    Play bPlay;
    Play aPlay;
    bytes32 aSalt;
  }

  // The following transitions are allowed:
  //
  // Start -> RoundProposed
  // RoundProposed -> Start // reject game
  // RoundProposed -> RoundAccepted
  // RoundAccepted -> Reveal
  // Reveal -> Start
  // Start -> Final
  //
  function validTransition(bytes _old, bytes _new) public pure returns (bool) {
    State memory oldState = unpack(_old); // inefficient to do all the unpacking upfront, but ok for now
    State memory newState = unpack(_new);

    revert();
  }

  // in this case the resolution function is pure, but it doesn't have to be in general
  function resolve(bytes _state) public pure returns (uint aBal, uint bBal) {
    State memory state = unpack(_state);

  }

  function unpack(bytes _state) private pure returns (State) {
    StateType stateType;
    uint256 aBal;
    uint256 bBal;
    uint256 stake;
    bytes32 aPreCommit;
    Play bPlay;
    Play aPlay;
    bytes32 aSalt;

    assembly {
      stateType := mload(add(_state, 32))
      aBal := mload(add(_state, 64))
      bBal := mload(add(_state, 96))
      stake := mload(add(_state, 128))
      aPreCommit := mload(add(_state, 160))
      bPlay := mload(add(_state, 192))
      aPlay := mload(add(_state, 224))
      aSalt := mload(add(_state, 256))
    }

    return State(stateType, aBal, bBal, stake, aPreCommit, bPlay, aPlay, aSalt);
  }
}
