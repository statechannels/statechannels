pragma solidity ^0.4.25;

import './SampleState.sol';

contract SampleContract {
    using SampleState for SampleState.Statuses;

    function getStatus(SampleState.Statuses self) public pure returns (SampleState.Statuses) {
        return self.getStatus();
    }
}