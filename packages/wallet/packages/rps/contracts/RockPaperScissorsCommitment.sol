pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "fmg-core/contracts/Commitment.sol";

library RockPaperScissorsCommitment {
    using Commitment for Commitment.CommitmentStruct;
    enum PositionType { Start, RoundProposed, RoundAccepted, Reveal }
    enum Play { Rock, Paper, Scissors }

    struct AppAttributes {
        PositionType positionType;
        uint256 stake;
        bytes32 preCommit;
        Play bWeapon;
        Play aWeapon;
        bytes32 salt;
    }

    struct RPSCommitmentStruct {
        PositionType positionType;
        uint256 stake;
        bytes32 preCommit;
        Play bWeapon;
        Play aWeapon;
        bytes32 salt;
        uint256[] allocation;
    }

    function fromFrameworkCommitment(Commitment.CommitmentStruct memory frameworkCommitment) public pure returns (RPSCommitmentStruct memory) {
        AppAttributes memory appAttributes = abi.decode(frameworkCommitment.appAttributes, (AppAttributes));

        return RPSCommitmentStruct(
            appAttributes.positionType,
            appAttributes.stake,
            appAttributes.preCommit,
            appAttributes.bWeapon,
            appAttributes.aWeapon,
            appAttributes.salt,
            frameworkCommitment.allocation
        );
    }
}
