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

    function validGameTransition(CountingState.CountingStateStruct memory _old, CountingState.CountingStateStruct memory _new) public pure returns (bool) {
        // regardless of whether we move to a Start or Concluded state, we must have:
        // 1. balances remain the same
        // 2. count must increase
        require(_new.frameworkState.resolution[0] == _old.frameworkState.resolution[0]);
        require(_new.frameworkState.resolution[1] == _old.frameworkState.resolution[1]);
        require(_new.gameCounter == _old.gameCounter + 1);

        return true;
    }
}