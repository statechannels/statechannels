// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import {ExitFormat as Outcome} from '@statechannels/exit-format/contracts/ExitFormat.sol';

/**
 * @dev The IMultiAssetHolder interface calls for functions that allow assets to be transferred from one channel to other channel and/or external destinations, as well as for guarantees to be claimed.
 */
interface IMultiAssetHolder {
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
     * @dev Computes the new outcome that should be stored against a target channel after a claim is made on its guarantor.
     * @param initialGuaranteeOutcome the outcome containing at least one guarantee(s) which will be claimed for each asset.
     * @param initialHoldings initial quantity of each asset held on chain for the guarantor channel. Order matches that of initialGuaranteeOutcome.
     * @param targetChannelIndex the index of the guarantee in the list of guarantees for the given asset -- equivalent to declaring a target channel
     * @param initialTargetOutcome initial outcome stored on chain for the target channel.
     * @param exitRequest list  of indices expressing which destinations in the allocation should be paid out for each asset.
     */
    function claim(
        Outcome.SingleAssetExit[] memory initialGuaranteeOutcome,
        uint256[] memory initialHoldings,
        uint48 targetChannelIndex,
        Outcome.SingleAssetExit[] memory initialTargetOutcome,
        uint48[][] memory exitRequest
    )
        external
        pure
        returns (
            Outcome.SingleAssetExit[] memory updatedTargetOutcome,
            uint256[] memory updatedHoldings,
            Outcome.SingleAssetExit[] memory exit
        );

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
