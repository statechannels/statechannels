// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;
import '../ERC20AssetHolder.sol';

/**
  * @dev This contract is a clone of the ERC20AssetHolder contract. It will be initialized to point to the TestNitroAdjudicator.
*/
contract TestErc20AssetHolder is ERC20AssetHolder {
    constructor(address _AdjudicatorAddress, address _TokenAddress)
        public
        ERC20AssetHolder(_AdjudicatorAddress, _TokenAddress)
    {}
}
