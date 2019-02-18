pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../Rules.sol";
import "../Commitment.sol";

contract TestRules {
    using Commitment for Commitment.CommitmentStruct;

    function validForceMove(
        Commitment.CommitmentStruct memory _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        return Rules.validForceMove(_fromCommitment, _toCommitment, v, r, s);
    }

    function validConclusionProof(
        Commitment.CommitmentStruct memory _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        return Rules.validConclusionProof(_fromCommitment, _toCommitment, v, r, s);
    }

    function validRefute(
        Commitment.CommitmentStruct memory _challengeCommitment,
        Commitment.CommitmentStruct memory _refutationCommitment,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        return Rules.validRefute(_challengeCommitment, _refutationCommitment, v, r, s);
    }

    function validRespondWithMove(
        Commitment.CommitmentStruct memory _challengeCommitment,
        Commitment.CommitmentStruct memory _nextCommitment,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        return Rules.validRespondWithMove(_challengeCommitment, _nextCommitment, v, r, s);
    }

    function validAlternativeRespondWithMove(
        Commitment.CommitmentStruct memory _challengeCommitment,
        Commitment.CommitmentStruct memory _alternativeCommitment,
        Commitment.CommitmentStruct memory _nextCommitment,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        return Rules.validAlternativeRespondWithMove(_challengeCommitment, _alternativeCommitment, _nextCommitment, v, r, s);
    }

    function validTransition(
        Commitment.CommitmentStruct memory  _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment
    ) public pure returns (bool) {
        return Rules.validTransition(_fromCommitment, _toCommitment);
    }

    function validGameTransition(
        Commitment.CommitmentStruct memory _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment
    ) public pure returns (bool) {
        return true;
        // return ForceMoveGame(_fromCommitment.channelType).validTransition(_fromCommitment.gameAttributes, _toCommitment.gameAttributes);
    }
}
