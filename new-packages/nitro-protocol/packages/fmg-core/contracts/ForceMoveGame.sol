pragma solidity ^0.4.25

interface ForceMoveGame {
  function validTransition(bytes oldState, bytes newState) external pure returns (bool);
}
