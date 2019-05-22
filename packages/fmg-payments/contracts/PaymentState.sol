pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import "./Commitment.sol";

library PaymentState {

    // PaymentGame State Fields
    // (relative to gamestate offset)
    // ==============================
    //
    // No special game attributes required - the 
    // resolution in the common state gives us all
    // we need!

    function aBal(Commitment.CommitmentStruct memory _state) public pure returns (uint256) {
        return _state.allocation[0];
    }

    function bBal(Commitment.CommitmentStruct memory _state) public pure returns (uint256 _bBal) {
        return _state.allocation[1];
    }

    function indexOfMover(Commitment.CommitmentStruct memory _state) public pure returns (uint8) {
        return uint8(_state.turnNum % 2);
    }
}
