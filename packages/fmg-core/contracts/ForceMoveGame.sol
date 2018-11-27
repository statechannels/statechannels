pragma solidity ^0.5.0;

interface ForceMoveGame {
  function validTransition(bytes calldata oldState, bytes calldata newState) external pure returns (bool);
}
