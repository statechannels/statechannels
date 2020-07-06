pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import '@counterfactual/cf-adjudicator-contracts/contracts/interfaces/CounterfactualApp.sol';

import './interfaces/ForceMoveApp.sol';

contract CounterfactualAdapterApp is ForceMoveApp {
    struct CounterfactualAdapterAppData {
        address cfAppDefinition;
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
        uint48, // turnNumB
        uint256 // nParticipants
    ) public override pure returns (bool) {
        CounterfactualAdapterAppData memory prevState = appData(a.appData);
        CounterfactualAdapterAppData memory nextState = appData(b.appData);
        require(
            prevState.cfAppDefinition == nextState.cfAppDefinition,
            'CounterfactualAdapterApp: CounterfactualApp appDefinition must be the same'
        );
        require(
            keccak256(
                CounterfactualApp(prevState.cfAppDefinition).applyAction(
                    prevState.cfAppData,
                    nextState.cfActionTaken
                )
            ) == keccak256(nextState.cfAppData),
            'CounterfactualAdapterApp: applyAction must compute same state being proposed'
        );
        return true;
    }
}
