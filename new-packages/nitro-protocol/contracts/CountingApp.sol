pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import './ForceMoveApp.sol';
import './Format.sol';

contract CountingApp is ForceMoveApp {
    struct CountingAppData {
        bytes outcome;
        uint256 counter;
    }

    function appData(bytes memory appDataBytes) internal pure returns (CountingAppData memory) {
        return abi.decode(appDataBytes, (CountingAppData));
    }

    function validTransition(Format.VariablePart memory a, Format.VariablePart memory b)
        public
        pure
        returns (bool)
    {
        require(
            appData(b.appData).counter == appData(a.appData).counter + 1,
            'CountingApp: Counter must be incremented'
        );
        require(
            keccak256(appData(b.appData).outcome) == keccak256(appData(a.appData).outcome),
            'CountingApp: Outcome must not change'
        );
        return true;
    }
}
