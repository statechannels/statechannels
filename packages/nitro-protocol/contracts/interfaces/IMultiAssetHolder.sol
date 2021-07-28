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
