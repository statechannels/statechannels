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
        uint256 turnNumB,
        uint256 numParticipants
    ) public pure returns (bool) {

        bool validPropose =
        (
            identical(a.outcome, b.outcome) &&
            appData(a.appData).furtherVotesRequired == 0 &&
            appData(b.appData).furtherVotesRequired == numParticipants - 1
        );
        
        bool validVote =
        (
            identical(a.outcome, b.outcome) &&
            appData(a.appData).furtherVotesRequired > 1 &&
            appData(b.appData).furtherVotesRequired == appData(a.appData).furtherVotesRequired - 1 &&
            identical(appData(a.appData).proposedOutcome, appData(b.appData).proposedOutcome)
        );

        bool validFinalVote =
        (
            appData(a.appData).furtherVotesRequired == 1 &&
            appData(b.appData).furtherVotesRequired == 0 &&
            identical(appData(a.appData).proposedOutcome, b.outcome) // &&
            // identical(appData(b.appData).proposedOutcome, bytes32(0) ) TODO
        );

        bool validVeto = // also covers validPass
        (
            identical(a.outcome, b.outcome) &&
            appData(b.appData).furtherVotesRequired == 0 // &&
            // appData(b.appData).proposedOutcome == bytes32(0) TODO
        );

        require((validPropose || validVote || validFinalVote || validVeto), 'ConsensusApp: No valid transition found');
        return true;
    }

    // Utilitiy helpers

    function identical(bytes memory a, bytes memory b) internal pure returns (bool) {
        return (keccak256(abi.encode(a)) == keccak256(abi.encode(b)));
    }

}
