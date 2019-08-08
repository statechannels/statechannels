pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import "./Commitment.sol";

library PaymentCommitment {

    // PaymentGame Commitment Fields
    // (relative to gamestate offset)
    // ==============================
    //
    // No special app attributes required - the
    // resolution in the common state gives us all
    // we need!

    function aBal(Commitment.CommitmentStruct memory _commitment) public pure returns (uint256) {
        return _commitment.allocation[0];
    }

    function bBal(Commitment.CommitmentStruct memory _commitment) public pure returns (uint256 _bBal) {
        return _commitment.allocation[1];
    }

    function indexOfMover(Commitment.CommitmentStruct memory _commitment) public pure returns (uint8) {
        return uint8(_commitment.turnNum % 2);
    }
}
