pragma solidity ^0.4.23;

interface ForceMoveGame {
  function validTransition(bytes oldState, bytes newState) external pure returns (bool);
  function resolve(bytes) external returns (uint, uint);
  function isConcluded(bytes) external returns (bool);
}
