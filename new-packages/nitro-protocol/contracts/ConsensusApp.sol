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
        if (oldCommitmentData.furtherVotesRequired == 0) {
            validateConsensusCommitment(oldCommitmentData);
        } else {
            validateProposeCommitment(oldCommitmentData);
        }

        if (newCommitmentData.furtherVotesRequired == 0) {
            validateConsensusCommitment(newCommitmentData);
        } else {
            validateProposeCommitment(newCommitmentData);
        }

        return
            validPropose(oldCommitmentData, newCommitmentData, numParticipants) ||
                validVote(oldCommitmentData, newCommitmentData) ||
                validVeto(oldCommitmentData, newCommitmentData) ||
                validPass(oldCommitmentData, newCommitmentData) ||
                validFinalVote(oldCommitmentData, newCommitmentData) ||
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

    function validVote(
        ConsensusCommitmentData memory oldCommitmentData,
        ConsensusCommitmentData memory newCommitmentData
    ) internal pure returns (bool) {
        if (
            oldCommitmentData.furtherVotesRequired > 1 &&
            furtherVotesRequiredDecremented(oldCommitmentData, newCommitmentData)
        ) {
            validateBalancesUnchanged(oldCommitmentData, newCommitmentData);
            validateProposalsUnchanged(oldCommitmentData, newCommitmentData);
            return true;
        } else {
            return false;
        }
    }

    function validVeto(
        ConsensusCommitmentData memory oldCommitmentData,
        ConsensusCommitmentData memory newCommitmentData
    ) internal pure returns (bool) {
        if (
            oldCommitmentData.furtherVotesRequired > 0 &&
            newCommitmentData.furtherVotesRequired == 0 &&
            balancesUnchanged(oldCommitmentData, newCommitmentData)
        ) {
            return true;
        } else {
            return false;
        }
    }

    function validFinalVote(
        ConsensusCommitmentData memory oldCommitmentData,
        ConsensusCommitmentData memory newCommitmentData
    ) internal pure returns (bool) {
        if (
            oldCommitmentData.furtherVotesRequired == 1 &&
            newCommitmentData.furtherVotesRequired == 0 &&
            balancesUpdated(oldCommitmentData, newCommitmentData)
        ) {
            return true;
        } else {
            return false;
        }
    }

    function validPass(
        ConsensusCommitmentData memory oldCommitmentData,
        ConsensusCommitmentData memory newCommitmentData
    ) internal pure returns (bool) {
        if (
            oldCommitmentData.furtherVotesRequired == 0 &&
            newCommitmentData.furtherVotesRequired == 0
        ) {
            validateBalancesUnchanged(oldCommitmentData, newCommitmentData);
            return true;
        } else {
            return false;
        }
    }

    // Helper validators

    function validateConsensusCommitment(ConsensusCommitmentData memory commitmentData)
        internal
        pure
    {
        require(
            commitmentData.furtherVotesRequired == 0,
            "ConsensusApp: 'furtherVotesRequired' must be 0 during consensus."
        );
        require(
            commitmentData.proposedOutcome.length == 0,
            "ConsensusApp: 'proposedOutcome' must be reset during consensus."
        );
    }

    function validateProposeCommitment(ConsensusCommitmentData memory commitmentData)
        internal
        pure
    {
        require(
            commitmentData.furtherVotesRequired != 0,
            "ConsensusApp: 'furtherVotesRequired' must not be 0 during propose."
        );
        require(
            commitmentData.proposedOutcome.length > 0,
            "ConsensusApp: 'proposedOutcome' must not be reset during propose."
        );
    }

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

    function validateProposalsUnchanged(
        ConsensusCommitmentData memory oldCommitmentData,
        ConsensusCommitmentData memory newCommitmentData
    ) private pure {
        require(
            encodeAndHashOutcome(oldCommitmentData.proposedOutcome) ==
                encodeAndHashOutcome(newCommitmentData.proposedOutcome),
            "ConsensusApp: 'proposedOutcome' must be the same between commitments."
        );
    }

    // Booleans

    function furtherVotesRequiredInitialized(
        ConsensusCommitmentData memory appData,
        uint256 numParticipants
    ) private pure returns (bool) {
        return (appData.furtherVotesRequired == numParticipants - 1);
    }

    function furtherVotesRequiredDecremented(
        ConsensusCommitmentData memory oldCommitmentData,
        ConsensusCommitmentData memory newCommitmentData
    ) private pure returns (bool) {
        return (newCommitmentData.furtherVotesRequired ==
            oldCommitmentData.furtherVotesRequired - 1);
    }

    function balancesUnchanged(
        ConsensusCommitmentData memory oldCommitmentData,
        ConsensusCommitmentData memory newCommitmentData
    ) private pure returns (bool) {
        return
            encodeAndHashOutcome(oldCommitmentData.currentOutcome) ==
                encodeAndHashOutcome(newCommitmentData.currentOutcome);
    }

    function balancesUpdated(
        ConsensusCommitmentData memory oldCommitmentData,
        ConsensusCommitmentData memory newCommitmentData
    ) private pure returns (bool) {
        return (encodeAndHashOutcome(oldCommitmentData.proposedOutcome) ==
            encodeAndHashOutcome(newCommitmentData.currentOutcome));
    }

    // Utilitiy helpers

    function encodeAndHashOutcome(bytes memory outcome) internal pure returns (bytes32) {
        return keccak256(abi.encode(outcome));
    }

}
