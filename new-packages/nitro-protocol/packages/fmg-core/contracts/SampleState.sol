pragma solidity ^0.4.25;

library SampleState {
    enum Statuses { On, Off }

    function getStatus(SampleState.Statuses self) public pure returns (SampleState.Statuses) {
        return self;
    }
}