pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/Commitment.sol";
import "../ConsensusCommitment.sol";

contract TestConsensusCommitment {
    using Commitment for Commitment.CommitmentStruct;
    using ConsensusCommitment for ConsensusCommitment.ConsensusCommitmentStruct;

    function fromFrameworkCommitment(Commitment.CommitmentStruct memory frameworkCommitment) public pure returns (ConsensusCommitment.ConsensusCommitmentStruct memory) {
        return ConsensusCommitment.fromFrameworkCommitment(frameworkCommitment);
    }

    function appAttributes(Commitment.CommitmentStruct memory frameworkCommitment) public pure returns (ConsensusCommitment.AppAttributes memory) {
        return ConsensusCommitment.appAttributes(frameworkCommitment);
    }
}
