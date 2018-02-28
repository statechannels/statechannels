pragma solidity ^0.4.18;

contract RockPaperScissors {
  enum StateTypes { Start, RoundProposed, RoundAccepted, Reveal }
  enum Plays { Rock, Paper, Scissors }

  struct State {
    StateType stateType;
    uint aBal;
    uint bBal;
    uint prize;
    bytes32 aCommit;
    Play bPlay;
    Play aPlay;
    bytes32 aSalt;
  }

  function unpack(bytes _state) private returns (uint32) {
    StateType stateType;
    uint aBal;
    uint bBal;
    uint prize;
    bytes32 aCommit;
    Play bPlay;
    Play aPlay;
    bytes32 aSalt;

    assembly {
      let stateType := mload(_state)
      let aBal := mload(add(_state, 32))
      let bBal := mload(add(_state, 64))
    }

    return aBal;

  }


  // The following transitions are allowed:
  //
  // Start -> RoundProposed
  // RoundProposed -> Start // reject game
  // RoundProposed -> RoundAccepted
  // RoundAccepted -> Reveal
  // Reveal -> Start
  //
  function validTransition(bytes _old, bytes _new) public returns (bool) {

  }

  function resolution(State _state) public returns (uint aBal, uint bBal) {
  }
}
