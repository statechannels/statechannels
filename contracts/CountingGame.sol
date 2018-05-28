pragma solidity ^0.4.18;

import "./CommonState.sol";
import "./CountingState.sol";

contract CountingGame {
    using CommonState for bytes;
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

    // in this case the resolution function is pure, but it doesn't have to be in general
    function resolve(bytes _state) public pure returns (uint aBal, uint bBal) {
        aBal = _state.aBal();
        bBal = _state.bBal();
    }

    // TODO: remove
    function isConcluded(bytes _state) pure public returns(bool) {
        return false;
    }
}
