pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../../Commitment.sol";
import "../CountingCommitment.sol";

contract TestCountingCommitment {
    using Commitment for Commitment.CommitmentStruct;
    using CountingCommitment for CountingCommitment.CountingCommitmentStruct;

    function fromFrameworkCommitment(Commitment.CommitmentStruct memory frameworkCommitment) public pure returns (CountingCommitment.CountingCommitmentStruct memory) {
        return CountingCommitment.fromFrameworkCommitment(frameworkCommitment);
    }
}
