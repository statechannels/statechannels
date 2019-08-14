pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import './Format.sol';
// TODO factor out VariablePart into a library (avoid replication)
interface ForceMoveApp {
    function validTransition(Format.VariablePart calldata a, Format.VariablePart calldata b)
        external
        pure
        returns (bool);
}
