// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @dev The IAssetHolder interface calls for functions that allow assets to be transferred from one channel to other channel and/or external destinations, as well as for guarantees to be claimed.
 */
interface IAssetHolder {
    /**
     * @notice Transfers the funds escrowed against `channelId` to the beneficiaries of that channel.
     * @dev Transfers the funds escrowed against `channelId` and transfers them to the beneficiaries of that channel.
     * @param channelId Unique identifier for a state channel.
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation
     */
    function transferAll(bytes32 channelId, bytes calldata allocationBytes) external;

    /**
     * @notice Transfers the funds escrowed against `guarantorChannelId` to the beneficiaries of the __target__ of that channel.
     * @dev Transfers the funds escrowed against `guarantorChannelId` to the beneficiaries of the __target__ of that channel.
     * @param guarantorChannelId Unique identifier for a guarantor state channel.
     * @param guaranteeBytes The abi.encode of Outcome.Guarantee
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation for the __target__
     */
    function claimAll(
        bytes32 guarantorChannelId,
        bytes calldata guaranteeBytes,
        bytes calldata allocationBytes
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
     * @dev Indicates that `amount` assets have been transferred (internally or externally) to the destination denoted by `destination`.
     * @param channelId The channelId of the funds being withdrawn.
     * @param destination An internal destination (channelId) of external destination (padded ethereum address)
     * @param amount Number of assets transferred (wei or tokens).
     */
    event AssetTransferred(bytes32 indexed channelId, bytes32 indexed destination, uint256 amount);
}
