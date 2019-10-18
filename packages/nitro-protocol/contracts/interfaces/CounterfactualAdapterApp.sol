pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '@counterfactual/cf-adjudicator-contracts/contracts/interfaces/CounterfactualApp.sol';

import './ForceMoveApp.sol';

contract CounterfactualAdapterApp is ForceMoveApp, CounterfactualApp {

    struct CounterfactualAdapterAppData {
        bytes cfAppData;
        bytes cfActionTaken;
    }

    function appData(bytes memory appDataBytes)
        internal
        pure
        returns (CounterfactualAdapterAppData memory)
    {
        return abi.decode(appDataBytes, (CounterfactualAdapterAppData));
    }

    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint256, // turnNumB
        uint256 // nParticipants
    ) public pure returns (bool) {
        CounterfactualAdapterAppData memory prevState = appData(a.appData);
        CounterfactualAdapterAppData memory nextState = appData(b.appData);

        require(
            keccak256(
                applyAction(
                    prevState.cfAppData,
                    nextState.cfActionTaken
                )
            ) == keccak256(nextState.cfAppData),
            'CounterfactualAdapterApp: applyAction must compute same state being proposed'
        );

        require(
            keccak256(computeOutcome(nextState.cfAppData)) == keccak256(b.outcome),
            'CounterfactualAdapterApp: outcome must be computed from computeOutcome'
        );

        return true;
    }
}
