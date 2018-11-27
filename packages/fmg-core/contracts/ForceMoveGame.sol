pragma solidity ^0.5.0;

interface ForceMoveGame {
  function validTransition(bytes oldState, bytes newState) external pure returns (bool);
}
