// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;
import '../ETHAssetHolder.sol';

/**
  * @dev This contract is a clone of the ETHAssetHolder contract. It will be initialized to point to the TestNitroAdjudicator.
*/
contract TestEthAssetHolder is ETHAssetHolder {
    constructor(address _AdjudicatorAddress) public ETHAssetHolder(_AdjudicatorAddress) {}
}
