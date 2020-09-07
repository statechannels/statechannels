// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import './interfaces/ForceMoveApp.sol';

/**
 * @dev The ConsensusApp complies with the ForceMoveApp interface and allows a channel outcome to be updated if and only if all participants are in agreement.
 */
contract ConsensusApp is ForceMoveApp {
    struct ConsensusAppData {
        uint32 furtherVotesRequired;
        bytes proposedOutcome;
    }

    /**
     * @notice Deocdes the appData.
     * @dev Deocdes the appData.
     * @param appDataBytes The abi.encode of a ConsensusAppData struct describing the application-specific data.
     * @return A ConsensusAppData struct containing the application-specific data.
     */
    function appData(bytes memory appDataBytes) internal pure returns (ConsensusAppData memory) {
        return abi.decode(appDataBytes, (ConsensusAppData));
    }

    /**
     * @notice Encodes the ConsensusApp rules.
     * @dev Encodes the ConsensusApp rules.
     * @param a State being transitioned from.
     * @param b State being transitioned to.
     * @param nParticipants Number of participants in this state channel.
     * @return true if the transition conforms to the ConsensusApp's rules, false otherwise.
     */
    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint48, // turnNumB, unused
        uint256 nParticipants
    ) public pure override returns (bool) {
        ConsensusAppData memory appDataA = appData(a.appData);
        ConsensusAppData memory appDataB = appData(b.appData);

        if (appDataB.furtherVotesRequired == nParticipants - 1) {
            // propose/veto/pass
            require(
                identical(a.outcome, b.outcome),
                'ConsensusApp: when proposing/vetoing/passing outcome must not change'
            );
        } else if (appDataB.furtherVotesRequired == 0) {
            // final vote
            require(
                appDataA.furtherVotesRequired == 1,
                'ConsensusApp: invalid final vote, furtherVotesRequired must transition from 1'
            );
            require(
                identical(appDataA.proposedOutcome, b.outcome),
                'ConsensusApp: invalid final vote, outcome must equal previous proposedOutcome'
            );
        } else {
            // vote
            require(
                appDataB.furtherVotesRequired == appDataA.furtherVotesRequired - 1,
                'ConsensusApp: invalid vote, furtherVotesRequired should decrement'
            );
            require(
                identical(a.outcome, b.outcome),
                'ConsensusApp: when voting, outcome must not change'
            );
            require(
                identical(appDataA.proposedOutcome, appDataB.proposedOutcome),
                'ConsensusApp: invalid vote, proposedOutcome must not change'
            );
        }
        return true;
    }

    // Utilitiy helpers

    /**
     * @notice Check for equality of two byte strings
     * @dev Check for equality of two byte strings
     * @param a One bytes string
     * @param b The other bytes string
     * @return true if the bytes are identical, false otherwise.
     */
    function identical(bytes memory a, bytes memory b) internal pure returns (bool) {
        return (keccak256(abi.encode(a)) == keccak256(abi.encode(b)));
    }
}
