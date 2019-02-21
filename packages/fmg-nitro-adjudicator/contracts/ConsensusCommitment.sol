pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/Commitment.sol";

library ConsensusCommitment {
    using Commitment for Commitment.CommitmentStruct;

    struct AppAttributes {
        uint256 consensusCounter;
        uint256[] proposedAllocation;
        address[] proposedDestination;
    }

    struct ConsensusCommitmentStruct {
        uint256 consensusCounter;
        uint256[] currentAllocation;
        address[] currentDestination;
        uint256[] proposedAllocation;
        address[] proposedDestination;
    }

    function appAttributes(Commitment.CommitmentStruct memory frameworkCommitment) public pure returns(AppAttributes memory) {
        return abi.decode(frameworkCommitment.appAttributes, (AppAttributes));
    }

    function fromFrameworkCommitment(Commitment.CommitmentStruct memory frameworkCommitment) public pure returns (ConsensusCommitmentStruct memory) {
        AppAttributes memory appAttributes = abi.decode(frameworkCommitment.appAttributes, (AppAttributes));

        return ConsensusCommitmentStruct(
            appAttributes.consensusCounter,
            frameworkCommitment.allocation,
            frameworkCommitment.destination,
            appAttributes.proposedAllocation,
            appAttributes.proposedDestination
        );
    }
}