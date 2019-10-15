pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

/**
  * @dev A ForceMoveApp describes the application-specific state machine of a ForceMove state channel DApp, by specifying whether one state is a valid transition from another.
*/
interface ForceMoveApp {
    struct VariablePart {
        bytes outcome;
        bytes appData;
    }

    /**
    * @notice Encodes application-specific rules for a particular ForceMove-compliant state channel.
    * @dev Encodes application-specific rules for a particular ForceMove-compliant state channel.
    * @param a State being transitioned from.
    * @param b State being transitioned to.
    * @param turnNumB Turn number being transitioned to.
    * @param nParticipants Number of participants in this state channel.
    * @return does this transition conform to the rules?
    */
    function validTransition(
        VariablePart calldata a,
        VariablePart calldata b,
        uint256 turnNumB,
        uint256 nParticipants
    ) external pure returns (bool);
}
