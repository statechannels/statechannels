pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

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
