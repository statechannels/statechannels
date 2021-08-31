// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import {ExitFormat as Outcome} from '@statechannels/exit-format/contracts/ExitFormat.sol';

/**
 * @dev The IMultiAssetHolder interface calls for functions that allow assets to be transferred from one channel to other channel and/or external destinations, as well as for guarantees to be claimed.
 */
interface IMultiAssetHolder {
    /**
     * @notice Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
     * @dev Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
     * @param assetIndex Will be used to slice the outcome into a single asset outcome.
     * @param fromChannelId Unique identifier for state channel to transfer funds *from*.
     * @param outcomeBytes The encoded Outcome of this state channel
     * @param stateHash The hash of the state stored when the channel finalized.
     * @param indices Array with each entry denoting the index of a destination to transfer funds to. An empty array indicates "all".
     */
    function transfer(
        uint256 assetIndex, // TODO consider a uint48?
        bytes32 fromChannelId,
        bytes memory outcomeBytes,
        bytes32 stateHash,
        uint256[] memory indices
    ) external;

    /**
     * @notice Transfers as many funds escrowed against `guarantorChannelId` as can be afforded for a specific destination in the beneficiaries of the __target__ of that channel. Checks against the storage in this contract.
     * @dev Transfers as many funds escrowed against `guarantorChannelId` as can be afforded for a specific destination in the beneficiaries of the __target__ of that channel. Checks against the storage in this contract.
     * @param assetIndex The index of the asset to be paid out (in the outcome)
     * @param guarantorChannelId Unique identifier for a guarantor state channel.
     * @param guarantorOutcomeBytes The abi.encode of the guarantor outcome.
     * @param guarantorStateHash the hash of the state stored on chain for the guarantor
     * @param targetOutcomeBytes The abi.encode of the guarantor outcome.
     * @param targetStateHash the hash of the state stored on chain for the guarantor
     * @param indices Array with each entry denoting the index of a destination (in the target channel) to transfer funds to. Should be in increasing order. An empty array indicates "all".
     */
    function claim(
        uint256 assetIndex,
        bytes32 guarantorChannelId,
        bytes memory guarantorOutcomeBytes,
        bytes32 guarantorStateHash,
        bytes memory targetOutcomeBytes,
        bytes32 targetStateHash,
        uint256[] memory indices
    ) external;

    /**
     * @notice Deposit ETH against a given destination.
     * @dev Deposit ETH against a given destination.
     * @param asset erc20 token address, or zero address to indicate ETH
     * @param destination ChannelId to be credited.
     * @param expectedHeld The number of wei the depositor believes are _already_ escrowed against the channelId.
     * @param amount The intended number of wei to be deposited.
     */
    function deposit(
        address asset,
        bytes32 destination,
        uint256 expectedHeld,
        uint256 amount
    ) external payable;

    /**
     * @dev Indicates that `amountDeposited` has been deposited into `destination`.
     * @param destination The channel being deposited into.
     * @param amountDeposited The amount being deposited.
     * @param destinationHoldings The new holdings for `destination`.
     */
    event Deposited(
        bytes32 indexed destination,
        address asset,
        uint256 amountDeposited,
        uint256 destinationHoldings
    );

    /**
     * @dev Indicates the assetOutcome for this channelId and assetIndex has changed due to a transfer or claim. Includes sufficient data to compute:
     * - the new assetOutcome
     * - the new holdings for this channelId and any others that were transferred to
     * - the payouts to external destinations
     * @param channelId The channelId of the funds being withdrawn.
     * @param initialHoldings holdings[asset][channelId] **before** the allocations were updated. The asset in question can be inferred from the calldata of the transaction (it might be "all assets")
     */
    event AllocationUpdated(bytes32 indexed channelId, uint256 assetIndex, uint256 initialHoldings);
}
