pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/Commitment.sol";

library ConsensusCommitment {
    using Commitment for Commitment.CommitmentStruct;
    
    struct AppAttributes {
        uint32 furtherVotesRequired;
        uint256[] proposedAllocation;
        address[] proposedDestination;
    }

    struct ConsensusCommitmentStruct {
        uint32 furtherVotesRequired;
        uint256[] currentAllocation;
        address[] currentDestination;
        uint256[] proposedAllocation;
        address[] proposedDestination;
    }

    function getAppAttributesFromFrameworkCommitment(Commitment.CommitmentStruct memory frameworkCommitment) public pure returns(AppAttributes memory) {
        return abi.decode(frameworkCommitment.appAttributes, (AppAttributes));
    }

    function fromFrameworkCommitment(Commitment.CommitmentStruct memory frameworkCommitment) public pure returns (ConsensusCommitmentStruct memory) {
        AppAttributes memory appAttributes = abi.decode(frameworkCommitment.appAttributes, (AppAttributes));

        return ConsensusCommitmentStruct(
            appAttributes.furtherVotesRequired,
            frameworkCommitment.allocation,
            frameworkCommitment.destination,
            appAttributes.proposedAllocation,
            appAttributes.proposedDestination
        );
    }
}