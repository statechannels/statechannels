pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './ForceMove/ForceMoveApp.sol';

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
        uint256, // turnNumB
        uint256 numParticipants
    ) public pure returns (bool) {
        ConsensusAppData memory appDataA = appData(a.appData);
        ConsensusAppData memory appDataB = appData(b.appData);

        if (appDataB.furtherVotesRequired == numParticipants - 1) {
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

    function identical(bytes memory a, bytes memory b) internal pure returns (bool) {
        return (keccak256(abi.encode(a)) == keccak256(abi.encode(b)));
    }

}
