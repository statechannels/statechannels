pragma solidity ^0.4.23;

interface ForceMoveGame {
  function validTransition(bytes oldState, bytes newState) external pure returns (bool);
}
