pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../Commitment.sol";

library CountingCommitment {
    using Commitment for Commitment.CommitmentStruct;

    struct AppAttributes {
        uint256 appCounter;
    }

    struct CountingCommitmentStruct {
        uint256 appCounter;
        uint256[] allocation;
        address[] destination;
    }

    function fromFrameworkCommitment(Commitment.CommitmentStruct memory frameworkCommitment) public pure returns (CountingCommitmentStruct memory) {
        AppAttributes memory appAttributes = abi.decode(frameworkCommitment.appAttributes, (AppAttributes));

        return CountingCommitmentStruct(appAttributes.appCounter, frameworkCommitment.allocation, frameworkCommitment.destination);
    }
}
