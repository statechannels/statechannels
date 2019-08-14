pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import './ForceMoveApp.sol';
import './Format.sol';

contract TrivialApp is ForceMoveApp {
    function validTransition(Format.VariablePart memory a, Format.VariablePart memory b)
        public
        pure
        returns (bool)
    {
        return true;
    }
}
