pragma solidity ^0.5.0;

import "../State.sol";
import "./CountingState.sol";

contract CountingGame {
    using State for bytes;
    using CountingState for bytes;

    // The following transitions are allowed:
    //
    // Start -> Concluded
    //
    function validTransition(bytes _old, bytes _new) public pure returns (bool) {
        // regardless of whether we move to a Start or Concluded state, we must have:
        // 1. balances remain the same
        // 2. count must increase
        require(_new.aBal() == _old.aBal());
        require(_new.bBal() == _old.bBal());
        require(_new.count() == _old.count() + 1);

        return true;
    }
}
