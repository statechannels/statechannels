pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../Commitment.sol";

contract TestCommitment {
    using Commitment for Commitment.CommitmentStruct;

    function isPreFundSetup(Commitment.CommitmentStruct memory _commitment) public pure returns (bool) {
        return _commitment.isPreFundSetup();
    }

    function isPostFundSetup(Commitment.CommitmentStruct memory _commitment) public pure returns (bool) {
        return _commitment.isPostFundSetup();
    }

    function isGame(Commitment.CommitmentStruct memory _commitment) public pure returns (bool) {
        return _commitment.isGame();
    }

    function isConclude(Commitment.CommitmentStruct memory _commitment) public pure returns (bool) {
        return _commitment.isConclude();
    }

    function channelId(Commitment.CommitmentStruct memory _commitment) public pure returns (address) {
        return _commitment.channelId();
    }

    function mover(Commitment.CommitmentStruct memory _commitment) public pure returns (address) {
        return _commitment.mover();
    }

    function requireSignature(Commitment.CommitmentStruct memory _commitment, uint8 _v, bytes32 _r, bytes32 _s) public pure {
        return Commitment.requireSignature(_commitment, _v, _r, _s);
    }

    function requireFullySigned(Commitment.CommitmentStruct memory _commitment, uint8[] memory _v, bytes32[] memory _r, bytes32[] memory _s) public pure {
        return Commitment.requireFullySigned(_commitment, _v, _r, _s);
    }

    function gameAttributesEqual(Commitment.CommitmentStruct memory _commitment, Commitment.CommitmentStruct memory _otherCommitment) public pure returns (bool) {
        return Commitment.gameAttributesEqual(_commitment, _otherCommitment);
    }

    function allocationsEqual(Commitment.CommitmentStruct memory _commitment, Commitment.CommitmentStruct memory _otherCommitment) public pure returns (bool) {
        return allocationsEqual(_commitment, _otherCommitment);
    }
}
