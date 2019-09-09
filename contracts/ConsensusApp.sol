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
                require(appDataA.furtherVotesRequired == 0, 'ConsensusApp: invalid propose, furtherVotesRequired must be transition from zero');
                return true;
            } else if (appDataB.furtherVotesRequired == 0) {
                // veto or pass
                require(appDataB.proposedOutcome.length == 0, 'ConsensusApp: invalid veto or invalid pass, proposedOutcome must transition to empty');
                return true;
            } else if (appDataB.furtherVotesRequired == appDataA.furtherVotesRequired - 1) {
                // vote
                require(appDataA.furtherVotesRequired > 1,'ConsensusApp: invalid vote, furtherVotesRequired must transition from at least 2');
                require(identical(appDataA.proposedOutcome, appDataB.proposedOutcome), 'ConsensusApp: invalid vote, proposedOutcome must not change');
                return true;
            }
        } else { 
            // final vote
            require(identical(appDataA.proposedOutcome, b.outcome), 'ConsensusApp: invalid final vote, outcome must equal previous proposedOutcome');
            require(appDataA.furtherVotesRequired == 1,'ConsensusApp: invalid final vote, furtherVotesRequired must transition from 1');
            require(appDataB.furtherVotesRequired == 0,'ConsensusApp: invalid final vote, furtherVotesRequired must transition to 0');
            require(appDataB.proposedOutcome.length == 0,'ConsensusApp: invalid final vote, proposedOutcome must transition to empty');
            return true;
        }
        revert('ConsensusApp: outcome must either be preserved or transition to previous proposedOutcome');

    }

    // Utilitiy helpers

    function identical(bytes memory a, bytes memory b) internal pure returns (bool) {
        return (keccak256(abi.encode(a)) == keccak256(abi.encode(b)));
    }

}
