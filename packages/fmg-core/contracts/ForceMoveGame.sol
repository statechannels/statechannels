pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import './State.sol';

interface ForceMoveGame {
  function validTransition(State.StateStruct calldata oldState, State.StateStruct calldata newState) external pure returns (bool);
}
