// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import '../ETHAssetHolder.sol';

/**
 * @dev This contract is a clone of the ETHAssetHolder contract. It will be initialized to point to the TestNitroAdjudicator.
 */
contract TestEthAssetHolder is ETHAssetHolder {
    uint256 public dummy; // this is simply to make the contract have distinct bytecode from the ETHAssetHolder (otherwise bytecode verification can fail)

    /**
     * @dev Manually set the holdings mapping to a given amount for a given channelId.  Shortcuts the deposit workflow (ONLY USE IN A TESTING ENVIRONMENT)
     * @param channelId Unique identifier for a state channel.
     * @param amount The number of assets that should now be "escrowed: against channelId
     */
    function setHoldings(bytes32 channelId, uint256 amount) external {
        holdings[channelId] = amount;
    }

    constructor(address _AdjudicatorAddress) ETHAssetHolder(_AdjudicatorAddress) {} // solhint-disable-line no-empty-blocks
}
