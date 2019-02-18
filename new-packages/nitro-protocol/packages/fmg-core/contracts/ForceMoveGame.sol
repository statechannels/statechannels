pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import './Commitment.sol';
interface ForceMoveGame {
  function validTransition(Commitment.CommitmentStruct calldata oldCommitment, Commitment.CommitmentStruct calldata newCommitment) external pure returns (bool);
}
