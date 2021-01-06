// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

/**
 * @dev The IAssetHolder interface calls for functions that allow assets to be transferred from one channel to other channel and/or external destinations, as well as for guarantees to be claimed.
 */
interface IAssetHolder {
    /**
     * @notice Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
     * @dev Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
     * @param fromChannelId Unique identifier for state channel to transfer funds *from*.
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation
     * @param indices Array with each entry denoting the index of a destination to transfer funds to.
     */
    function transfer(
        bytes32 fromChannelId,
        bytes calldata allocationBytes,
        uint256[] memory indices
    ) external;

    /**
     * @notice Transfers as many funds escrowed against `guarantorChannelId` as can be afforded for a specific destination in the beneficiaries of the __target__ of that channel. Checks against the storage in this contract.
     * @dev Transfers as many funds escrowed against `guarantorChannelId` as can be afforded for a specific destination in the beneficiaries of the __target__ of that channel. Checks against the storage in this contract.
     * @param guarantorChannelId Unique identifier for a guarantor state channel.
     * @param guaranteeBytes The abi.encode of Outcome.Guarantee
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation for the __target__
     * @param indices Array with each entry denoting the index of a destination (in the target channel) to transfer funds to. Should be in increasing order. An empty array indicates "all".
     */
    function claim(
        bytes32 guarantorChannelId,
        bytes calldata guaranteeBytes,
        bytes calldata allocationBytes,
        uint256[] memory indices
    ) external;

    /**
     * @dev Indicates that `amountDeposited` has been deposited into `destination`.
     * @param destination The channel being deposited into.
     * @param amountDeposited The amount being deposited.
     * @param destinationHoldings The new holdings for `destination`.
     */
    event Deposited(
        bytes32 indexed destination,
        uint256 amountDeposited,
        uint256 destinationHoldings
    );

    /**
     * @dev Indicates the assetOutcomeHash for this channelId has changed due to a transfer or claim. Includes sufficient data to compute:
     * - the preimage of this hash as well as
     * - the new holdings for this channelId and any others that were transferred to
     * - the payouts to external destinations
     * @param channelId The channelId of the funds being withdrawn.
     * @param initialHoldings holdings[channelId] **before** the allocations were updated
     */
    event AllocationUpdated(bytes32 indexed channelId, uint256 initialHoldings);
}
