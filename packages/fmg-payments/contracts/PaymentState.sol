pragma solidity ^0.4.18;

import "./State.sol";

library PaymentState {

    // PaymentGame State Fields
    // (relative to gamestate offset)
    // ==============================
    //
    // No special game attributes required - the 
    // resolution in the common state gives us all
    // we need!

    function aBal(bytes _state) public pure returns (uint256) {
        return State.resolution(_state)[0];
    }

    function bBal(bytes _state) public pure returns (uint256 _bBal) {
        return State.resolution(_state)[1];
    }
}
