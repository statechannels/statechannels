pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './ForceMove/ForceMoveApp.sol';

contract TrivialApp is ForceMoveApp {
    function validTransition(
        VariablePart memory, // a
        VariablePart memory, // b
        uint256, // turnNumB
        uint256 // nParticipants
    ) public pure returns (bool) {
        return true;
    }
}
