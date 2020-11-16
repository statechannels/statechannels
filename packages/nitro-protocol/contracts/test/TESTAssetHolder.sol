// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import '../AssetHolder.sol';

/**
 * @dev This contract extends the AssetHolder contract to enable it to be more easily unit-tested. It exposes public or external functions that set storage variables or wrap otherwise internal functions. It should not be deployed in a production environment.
 */
contract TESTAssetHolder is AssetHolder {
    /**
     * @notice Constructor function storing the AdjudicatorAddress.
     * @dev Constructor function storing the AdjudicatorAddress.
     * @param _AdjudicatorAddress Address of an Adjudicator  contract, supplied at deploy-time.
     */
    constructor(address _AdjudicatorAddress) {
        AdjudicatorAddress = _AdjudicatorAddress;
    }

    // Public wrappers for internal methods:

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

    /**
     * @notice Transfers the funds escrowed against `channelId` to the beneficiaries of that channel. No checks performed against storage in this contract. Permissions have been bypassed for testing purposes.
     * @dev Transfers the funds escrowed against `channelId` and transfers them to the beneficiaries of that channel. No checks performed against storage in this contract. Permissions have been bypassed for testing purposes.
     * @param channelId Unique identifier for a state channel.
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation
     */
    function transferAllAdjudicatorOnly(bytes32 channelId, bytes calldata allocationBytes)
        external
        override
    {
        _transferAll(channelId, allocationBytes);
    }

    /**
     * @dev Wrapper for otherwise internal function. Checks if a given destination is external (and can therefore have assets transferred to it) or not.
     * @param destination Destination to be checked.
     * @return True if the destination is external, false otherwise.
     */
    function isExternalDestination(bytes32 destination) public pure returns (bool) {
        return _isExternalDestination(destination);
    }

    /**
     * @dev Wrapper for otherwise internal function. Converts an ethereum address to a nitro external destination.
     * @param participant The address to be converted.
     * @return The input address left-padded with zeros.
     */
    function addressToBytes32(address participant) public pure returns (bytes32) {
        return _addressToBytes32(participant);
    }
}
