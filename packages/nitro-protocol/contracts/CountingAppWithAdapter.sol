pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import './interfaces/CounterfactualAdapterApp.sol';

contract CountingAppWithAdapter is CounterfactualAdapterApp {
    struct CountingAppData {
        uint256 counter;
        bytes outcome;
    }

    function appData(bytes memory appDataBytes) internal pure returns (CountingAppData memory) {
        return abi.decode(appDataBytes, (CountingAppData));
    }

    function applyAction(
        bytes memory prevState,
        bytes memory /* action */
    ) public pure returns (bytes memory) {
        CountingAppData memory prevAppData = appData(prevState);
        CountingAppData memory newAppData = CountingAppData(prevAppData.counter + 1);
        return abi.encode(newAppData);
    }

    function computeOutcome(
        bytes memory state
    ) public pure returns (bytes memory) {
        return appData(state).outcome;
    }

    function isStateTerminal(bytes calldata)
        external
        pure
        returns (bool)
    {
        revert("The isStateTerminal method has no implementation for this App");
    }

    function getTurnTaker(bytes calldata, address[] calldata)
        external
        pure
        returns (address)
    {
        revert("The getTurnTaker method has no implementation for this App");
    }

}
