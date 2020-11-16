// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import '../ERC20AssetHolder.sol';
import './TESTAssetHolder.sol';

/**
 * @dev This contract is a clone of the ERC20AssetHolder contract. It will be initialized to point to the TestNitroAdjudicator.
 */
contract TestErc20AssetHolder is ERC20AssetHolder {
    constructor(address _AdjudicatorAddress, address _TokenAddress)
        ERC20AssetHolder(_AdjudicatorAddress, _TokenAddress)
    {}

    /**
     * @dev Manually set the holdings mapping to a given amount for a given channelId.  Shortcuts the deposit workflow (ONLY USE IN A TESTING ENVIRONMENT)
     * @param channelId Unique identifier for a state channel.
     * @param amount The number of assets that should now be "escrowed: against channelId
     */
    function setHoldings(bytes32 channelId, uint256 amount) external {
        holdings[channelId] = amount;
    }

    /**
     * @dev Sets the given assetOutcomeHash for the given channelId in the assetOutcomeHashes storage mapping, but circumvents the AdjudicatorOnly modifier (thereby allowing externally owned accounts to call the method).
     * @param channelId Unique identifier for a state channel.
     * @param assetOutcomeHash The keccak256 of the abi.encode of the Outcome.
     */
    function setAssetOutcomeHashPermissionless(bytes32 channelId, bytes32 assetOutcomeHash)
        external
        returns (bool success)
    {
        _setAssetOutcomeHash(channelId, assetOutcomeHash);
        return true;
    }
}
