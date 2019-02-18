pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../Commitment.sol";
import "./CountingCommitment.sol";

contract CountingGame {
    // The following transitions are allowed:
    //
    // Start -> Concluded
    //
    using CountingCommitment for CountingCommitment.CountingCommitmentStruct;

    function validTransition(Commitment.CommitmentStruct memory _old, Commitment.CommitmentStruct memory _new) public pure returns (bool) {
        // regardless of whether we move to a Start or Concluded Commitment, we must have:
        // 1. balances remain the same
        // 2. count must increase

        CountingCommitment.CountingCommitmentStruct memory oldCommitment = CountingCommitment.fromFrameworkCommitment(_old);
        CountingCommitment.CountingCommitmentStruct memory newCommitment = CountingCommitment.fromFrameworkCommitment(_new);

        require(
            keccak256(abi.encode(oldCommitment.allocation)) == keccak256(abi.encode(newCommitment.allocation)),
            "CountingGame: allocations must be equal"
        );
        require(
            newCommitment.gameCounter == oldCommitment.gameCounter + 1,
            "CountingGame: gameCounter must increment by 1"
        );

        return true;
    }
}