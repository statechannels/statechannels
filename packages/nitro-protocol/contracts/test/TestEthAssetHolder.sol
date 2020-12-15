// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import '../ETHAssetHolder.sol';

/**
 * @dev This contract is a clone of the ETHAssetHolder contract. It will be initialized to point to the TestNitroAdjudicator.
 */
contract TestEthAssetHolder is ETHAssetHolder {
    uint256 public dummy; // this is simply to make the contract have distinct bytecode from the ETHAssetHolder (otherwise bytecode verification can fail)

    constructor(address _AdjudicatorAddress) ETHAssetHolder(_AdjudicatorAddress) {} // solhint-disable-line no-empty-blocks
}
