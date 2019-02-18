pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../Commitment.sol";

library CountingCommitment {
    using Commitment for Commitment.CommitmentStruct;

    struct GameAttributes {
        uint256 gameCounter;
    }

    struct CountingCommitmentStruct {
        uint256 gameCounter;
        uint256[] allocation;
        address[] destination;
    }

    function fromFrameworkCommitment(Commitment.CommitmentStruct memory frameworkCommitment) public pure returns (CountingCommitmentStruct memory) {
        GameAttributes memory gameAttributes = abi.decode(frameworkCommitment.gameAttributes, (GameAttributes));

        return CountingCommitmentStruct(gameAttributes.gameCounter, frameworkCommitment.allocation, frameworkCommitment.destination);
    }
}
