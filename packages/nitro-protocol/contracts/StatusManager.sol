pragma solidity 0.7.4;

import './interfaces/IStatusManager.sol';

contract StatusManager is IStatusManager {
    mapping(bytes32 => bytes32) public statusOf;
}
