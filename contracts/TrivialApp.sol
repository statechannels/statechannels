pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import './ForceMoveApp.sol';

contract TrivialApp is ForceMoveApp {
    function validTransition(VariablePart memory a, VariablePart memory b)
        public
        pure
        returns (bool)
    {
        return true;
    }
}
