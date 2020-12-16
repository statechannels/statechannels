// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import './interfaces/IForceMoveApp.sol';

/**
 * @dev The CountingApp contracts complies with the ForceMoveApp interface and allows only for a simple counter to be incremented. Used for testing purposes.
 */
contract CountingApp is IForceMoveApp {
    struct CountingAppData {
        uint256 counter;
    }

    /**
     * @notice Decodes the appData.
     * @dev Decodes the appData.
     * @param appDataBytes The abi.encode of a CountingAppData struct describing the application-specific data.
     * @return A CountingAppDatat struct containing the application-specific data.
     */
    function appData(bytes memory appDataBytes) internal pure returns (CountingAppData memory) {
        return abi.decode(appDataBytes, (CountingAppData));
    }

    /**
     * @notice Encodes the CountingApp rules.
     * @dev Encodes the CountingApp rules.
     * @param a State being transitioned from.
     * @param b State being transitioned to.
     * @return true if the transition conforms to the rules, false otherwise.
     */
    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint48, // turnNumB, unused
        uint256 // nParticipants, unused
    ) public override pure returns (bool) {
        require(
            appData(b.appData).counter == appData(a.appData).counter + 1,
            'Counter must be incremented'
        );
        // Note this is gas inefficient, and inferior to _bytesEqual in use elsewhere
        require(keccak256(b.outcome) == keccak256(a.outcome), 'Outcome must not change');
        return true;
    }
}
