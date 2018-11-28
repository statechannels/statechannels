pragma solidity ^0.5.0;

library SampleState {
    enum Statuses { On, Off }
    uint8 public constant On = 0;
    uint8 public constant Off = 1;
    
    function isOn() public pure returns (uint8) {
        return On;
    }
}