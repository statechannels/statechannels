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

        if (identical(a.outcome, b.outcome)) {
            if (appDataB.furtherVotesRequired == numParticipants - 1) {
                // propose
                require(appDataA.furtherVotesRequired == 0);
                return true;
            } else if (appDataB.furtherVotesRequired == 0) {
                // veto or pass
                require(appDataB.proposedOutcome.length == 0);
                return true;
            } else if (appDataB.furtherVotesRequired == appDataA.furtherVotesRequired - 1) {
                // vote
                require(appDataA.furtherVotesRequired > 1);
                require(identical(appDataA.proposedOutcome, appDataB.proposedOutcome));
                return true;
            }
        } else { 
            // final vote
            require(identical(appDataA.proposedOutcome, b.outcome));
            require(appDataA.furtherVotesRequired == 1);
            require(appDataB.furtherVotesRequired == 0);
            require(appDataB.proposedOutcome.length == 0);
            return true;
        }
        revert('ConsensusApp: No valid transition found');

    }

    // Utilitiy helpers

    function identical(bytes memory a, bytes memory b) internal pure returns (bool) {
        return (keccak256(abi.encode(a)) == keccak256(abi.encode(b)));
    }

}
