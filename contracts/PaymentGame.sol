pragma solidity ^0.4.18;

contract PaymentGame {
  enum StateType { ANext, BNext, Final }

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
  }

  // in this case the resolution function is pure, but it doesn't have to be in general
  function resolve(bytes _state) public pure returns (uint aBal, uint bBal) {
  }

}
