pragma solidity ^0.5.0;

import './SampleState.sol';

contract SampleContract {
    function foo() public pure returns (uint8) {
        return SampleState.isOn();
    }
}