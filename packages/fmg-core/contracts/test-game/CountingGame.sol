pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../State.sol";
import "./CountingState.sol";

contract CountingGame {
    // The following transitions are allowed:
    //
    // Start -> Concluded
    //
    using CountingState for CountingState.CountingStateStruct;

    function validTransition(CountingState.CountingStateStruct memory _old, CountingState.CountingStateStruct memory _new) public pure returns (bool) {
        // regardless of whether we move to a Start or Concluded state, we must have:
        // 1. balances remain the same
        // 2. count must increase
        require(_new.aBal() == _old.aBal());
        require(_new.bBal() == _old.bBal());
        require(_new.count == _old.count + 1);

        return true;
    }
}
