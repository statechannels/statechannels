pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import "../ConsensusCommitment.sol";
import "../ConsensusApp.sol";

contract TestConsensusApp is ConsensusApp {
  using ConsensusCommitment for ConsensusCommitment.ConsensusCommitmentStruct;

  function invalidTransitionPub() public pure returns (bool) {
    return invalidTransition();
  }

  function validateProposePub(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment,
    uint numParticipants
  ) public pure returns (bool) {
    return validatePropose(oldCommitment, newCommitment, numParticipants);
  }

  function validateVotePub(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) public pure returns (bool) {
    return validateVote(oldCommitment, newCommitment);
  }

  function validateFinalVotePub(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) public pure returns (bool) {
    return validateFinalVote(oldCommitment, newCommitment);
  }

  function validateVetoPub(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) public pure returns (bool) {
    return validateVeto(oldCommitment, newCommitment);
  }

  function validatePassPub(
    ConsensusCommitment.ConsensusCommitmentStruct memory oldCommitment,
    ConsensusCommitment.ConsensusCommitmentStruct memory newCommitment
  ) public pure returns (bool) {
    return validatePass(oldCommitment, newCommitment);
  }
}
