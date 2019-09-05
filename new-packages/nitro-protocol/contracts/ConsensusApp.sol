pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './ForceMoveApp.sol';

contract ConsensusApp is ForceMoveApp {
    struct ConsensusAppAttributes {
        uint32 furtherVotesRequired;
        bytes proposedOutcome;
    }

    struct ConsensusCommitmentData {
        uint32 furtherVotesRequired;
        bytes currentOutcome;
        bytes proposedOutcome;
    }

    function validTransition(
        VariablePart memory oldVariablePart,
        VariablePart memory newVariablePart,
        uint256 turnNumB,
        uint256 numParticipants
    ) public pure returns (bool) {
        ConsensusCommitmentData memory oldCommitmentData = fromVariablePart(oldVariablePart);
        ConsensusCommitmentData memory newCommitmentData = fromVariablePart(newVariablePart);

        /** todo: we used to validate the length of allocations and destinations.
          * In order to do this validation, proposed outcome needs to be converted from bytes to struct with a shape.
          */

        return
            validPropose(oldCommitmentData, newCommitmentData, numParticipants) ||
                invalidTransition();
    }

    // Helper converters

    function fromVariablePart(VariablePart memory variablePart)
        public
        pure
        returns (ConsensusCommitmentData memory)
    {
        ConsensusAppAttributes memory appAttributes = abi.decode(
            variablePart.appData,
            (ConsensusAppAttributes)
        );

        return
            ConsensusCommitmentData(
                appAttributes.furtherVotesRequired,
                variablePart.outcome,
                appAttributes.proposedOutcome
            );
    }

    function invalidTransition() internal pure returns (bool) {
        revert('ConsensusApp: No valid transition found for commitments');
    }

    // Transition validators

    function validPropose(
        ConsensusCommitmentData memory oldCommitmentData,
        ConsensusCommitmentData memory newCommitmentData,
        uint256 numParticipants
    ) internal pure returns (bool) {
        if (furtherVotesRequiredInitialized(newCommitmentData, numParticipants)) {
            validateBalancesUnchanged(oldCommitmentData, newCommitmentData);
            return true;
        } else {
            return false;
        }
    }

    // Helper validators

    function validateBalancesUnchanged(
        ConsensusCommitmentData memory oldCommitmentData,
        ConsensusCommitmentData memory newCommitmentData
    ) private pure {
        require(
            encodeAndHashOutcome(oldCommitmentData.currentOutcome) ==
                encodeAndHashOutcome(newCommitmentData.currentOutcome),
            "ConsensusApp: 'outcome' must be the same between commitments."
        );
    }

    // Booleans

    function furtherVotesRequiredInitialized(
        ConsensusCommitmentData memory appData,
        uint256 numParticipants
    ) private pure returns (bool) {
        return (appData.furtherVotesRequired == numParticipants - 1);
    }

    // Utilitiy helpers

    function encodeAndHashOutcome(bytes memory outcome) internal pure returns (bytes32) {
        return keccak256(abi.encode(outcome));
    }

}
