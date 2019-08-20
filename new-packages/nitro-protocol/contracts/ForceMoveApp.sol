pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import './Format.sol';
// TODO factor out VariablePart into a library (avoid replication)
interface ForceMoveApp {
    struct VariablePart {
        bytes outcome;
        bytes appData;
    }

    function validTransition(
        VariablePart calldata a,
        VariablePart calldata b,
        uint256 turnNumB,
        uint256 nParticipants
    ) external pure returns (bool);
}
