pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './ForceMoveApp.sol';

contract ConsensusApp is ForceMoveApp {
    struct ConsensusAppData {
        uint32 furtherVotesRequired;
        bytes proposedOutcome;
    }

    function appData(bytes memory appDataBytes) internal pure returns (ConsensusAppData memory) {
        return abi.decode(appDataBytes, (ConsensusAppData));
    }

    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint256 turnNumB, // unused
        uint256 numParticipants
    ) public pure returns (bool) {

        ConsensusAppData memory appDataA = appData(a.appData);
        ConsensusAppData memory appDataB = appData(b.appData);

        bool validPropose =
        (
            identical(a.outcome, b.outcome) &&
            appDataA.furtherVotesRequired == 0 &&
            appDataB.furtherVotesRequired == numParticipants - 1
        );
        
        bool validVote =
        (
            identical(a.outcome, b.outcome) &&
            appDataA.furtherVotesRequired > 1 &&
            appDataB.furtherVotesRequired == appDataA.furtherVotesRequired - 1 &&
            identical(appDataA.proposedOutcome, appDataB.proposedOutcome)
        );

        bool validFinalVote =
        (
            appDataA.furtherVotesRequired == 1 &&
            appDataB.furtherVotesRequired == 0 &&
            identical(appDataA.proposedOutcome, b.outcome) &&
            appDataB.proposedOutcome.length == 0
        );

        bool validVeto = // also covers validPass
        (
            identical(a.outcome, b.outcome) &&
            appDataB.furtherVotesRequired == 0 &&
            appDataB.proposedOutcome.length == 0
        );

        require((validPropose || validVote || validFinalVote || validVeto), 'ConsensusApp: No valid transition found');
        return true;
    }

    // Utilitiy helpers

    function identical(bytes memory a, bytes memory b) internal pure returns (bool) {
        return (keccak256(abi.encode(a)) == keccak256(abi.encode(b)));
    }

}
