// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

/**
 * @dev The IForceMoveApp interface calls for its children to implement an application-specific validTransition function, defining the state machine of a ForceMove state channel DApp.
 */
interface IForceMoveApp {
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
     * @return true if the transition conforms to this application's rules, false otherwise
     */
    function validTransition(
        VariablePart calldata a,
        VariablePart calldata b,
        uint48 turnNumB,
        uint256 nParticipants
    ) external pure returns (bool);
}

/**
 * @dev The IForceMoveApp interface calls for its children to implement an application-specific validTransition function, defining the state machine of a ForceMove state channel DApp.
 */
interface IForceMoveApp2 {
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
     * @param signedBy Bit field showing which participants signed state b.
     * @return true if the transition conforms to this application's rules, false otherwise
     */
    function validTransition(
        VariablePart calldata a,
        VariablePart calldata b,
        uint48 turnNumB,
        uint256 nParticipants,
        uint8 signedBy
    ) external pure returns (bool);
    // signedBy
    // 0b000 = 0 : No-one
    // 0b001 = 1 : participant 0
    // 0b010 = 2 : participant 1
    // 0b011 = 3 : participant 0 and participant 1
    // 0b100 = 4 : participant 2
    // 0b101 = 5 : participant 0 and participant 2
    // 0b110 = 6 : participant 1 and participant 2
    // 0b111 = 7 : everyone
}
