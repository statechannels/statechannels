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

    function validTransition(State.StateStruct memory _old, State.StateStruct memory _new) public pure returns (bool) {
        // regardless of whether we move to a Start or Concluded state, we must have:
        // 1. balances remain the same
        // 2. count must increase

        CountingState.CountingStateStruct memory oldState = CountingState.fromFrameworkState(_old);
        CountingState.CountingStateStruct memory newState = CountingState.fromFrameworkState(_new);

        require(
            keccak256(abi.encode(oldState.allocation)) == keccak256(abi.encode(newState.allocation)),
            "CountingGame: allocations must be equal"
        );
        require(
            newState.gameCounter == oldState.gameCounter + 1,
            "CountingGame: gameCounter must increment by 1"
        );

        return true;
    }
}