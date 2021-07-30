// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import {ExitFormat as Outcome} from '@statechannels/exit-format/contracts/ExitFormat.sol';
import './ForceMove.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/IMultiAssetHolder.sol';

/**
@dev An implementation of the IMultiAssetHolder interface. The AssetHolder contract escrows ETH or tokens against state channels. It allows assets to be internally accounted for, and ultimately prepared for transfer from one channel to other channels and/or external destinations, as well as for guarantees to be claimed.
 */
contract MultiAssetHolder is IMultiAssetHolder, StatusManager {
    using SafeMath for uint256;

    // *******
    // Storage
    // *******

    /**
     * holdings[asset][channelId] is the amount of asset held against channel channelId. 0 address implies ETH
     */
    mapping(address => mapping(bytes32 => uint256)) public holdings;

    // **************
    // External methods
    // **************

    /**
     * @notice Deposit ETH or erc20 tokens against a given channelId.
     * @dev Deposit ETH or erc20 tokens against a given channelId.
     * @param asset erc20 token address, or zero address to indicate ETH
     * @param channelId ChannelId to be credited.
     * @param expectedHeld The number of wei/tokens the depositor believes are _already_ escrowed against the channelId.
     * @param amount The intended number of wei/tokens to be deposited.
     */
    function deposit(
        address asset,
        bytes32 channelId,
        uint256 expectedHeld,
        uint256 amount
    ) external override payable {
        require(!_isExternalDestination(channelId), 'Deposit to external destination');
        uint256 amountDeposited;
        // this allows participants to reduce the wait between deposits, while protecting them from losing funds by depositing too early. Specifically it protects against the scenario:
        // 1. Participant A deposits
        // 2. Participant B sees A's deposit, which means it is now safe for them to deposit
        // 3. Participant B submits their deposit
        // 4. The chain re-orgs, leaving B's deposit in the chain but not A's
        uint256 held = holdings[asset][channelId];
        require(held >= expectedHeld, 'holdings < expectedHeld');
        require(held < expectedHeld.add(amount), 'holdings already sufficient');

        // The depositor wishes to increase the holdings against channelId to amount + expectedHeld
        // The depositor need only deposit (at most) amount + (expectedHeld - holdings) (the term in parentheses is non-positive)

        amountDeposited = expectedHeld.add(amount).sub(held); // strictly positive
        // require successful deposit before updating holdings (protect against reentrancy)
        if (asset == address(0)) {
            require(msg.value == amount, 'Incorrect msg.value for deposit');
        } else {
            // require successful deposit before updating holdings (protect against reentrancy)
            require(
                IERC20(asset).transferFrom(msg.sender, address(this), amountDeposited),
                'Could not deposit ERC20s'
            );
        }

        uint256 nowHeld = held.add(amountDeposited);
        holdings[asset][channelId] = nowHeld;
        emit Deposited(channelId, asset, amountDeposited, nowHeld);

        if (asset == address(0)) {
            // refund whatever wasn't deposited.
            uint256 refund = amount.sub(amountDeposited);
            (bool success, ) = msg.sender.call{value: refund}(''); //solhint-disable-line avoid-low-level-calls
            require(success, 'Could not refund excess funds');
        }
    }

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
        override
        pure
        returns (
            Outcome.SingleAssetExit[] memory updatedTargetOutcome,
            uint256[] memory updatedHoldings,
            Outcome.SingleAssetExit[] memory exit
        )
    {
        // checks
        require(
            initialTargetOutcome.length == initialHoldings.length,
            'outcome.length!=holdings.length'
        );
        require(
            initialTargetOutcome.length == initialGuaranteeOutcome.length,
            'outcome.length!=guarantee.length'
        );

        exit = new Outcome.SingleAssetExit[](initialTargetOutcome.length);
        updatedHoldings = initialHoldings;

        // Iterate through every asset
        for (uint256 assetIndex = 0; assetIndex < initialGuaranteeOutcome.length; assetIndex++) {
            Outcome.Allocation[] memory guarantees = initialGuaranteeOutcome[assetIndex]
                .allocations;

            Outcome.Allocation[] memory targetAllocations = initialTargetOutcome[assetIndex]
                .allocations;

            // If exitRequest is empty for the allocation we want ALL to exit
            Outcome.Allocation[] memory exitAllocations = new Outcome.Allocation[](
                exitRequest[assetIndex].length > 0
                    ? exitRequest[assetIndex].length
                    : targetAllocations.length
            );

            updatedTargetOutcome = new Outcome.SingleAssetExit[](initialTargetOutcome.length);

            uint256 surplus = initialHoldings[assetIndex];
            uint48 exitRequestIndex = 0;

            require(
                guarantees[targetChannelIndex].allocationType ==
                    uint8(Outcome.AllocationType.guarantee),
                'allocation not a guarantee'
            );

            bytes32[] memory destinations = decodeGuaranteeData(
                guarantees[targetChannelIndex].metadata
            );

            // Iterate through every destination in the guarantee's destinations
            for (
                uint256 destinationIndex = 0;
                destinationIndex < destinations.length;
                destinationIndex++
            ) {
                if (surplus == 0) break;

                // Iterate through every allocation item in the target allocation
                for (
                    uint256 targetAllocIndex = 0;
                    targetAllocIndex < targetAllocations.length;
                    targetAllocIndex++
                ) {
                    if (surplus == 0) break;

                    if (
                        destinations[destinationIndex] ==
                        targetAllocations[targetAllocIndex].destination
                    ) {
                        // if we find it, compute new amount
                        uint256 affordsForDestination = min(
                            targetAllocations[assetIndex].amount,
                            surplus
                        );

                        // only if specified in supplied exitRequests, or we if we are doing "all"
                        if (
                            ((exitRequest.length == 0) || (exitRequest[assetIndex].length == 0)) ||
                            ((exitRequestIndex < exitRequest.length) &&
                                exitRequest[assetIndex][exitRequestIndex] == targetAllocIndex)
                        ) {
                            // Update the holdings and allocation
                            updatedHoldings[assetIndex] -= affordsForDestination;
                            targetAllocations[targetAllocIndex].amount -= affordsForDestination;

                            exitAllocations[exitRequestIndex] = Outcome.Allocation(
                                targetAllocations[targetAllocIndex].destination,
                                affordsForDestination,
                                targetAllocations[targetAllocIndex].allocationType,
                                targetAllocations[targetAllocIndex].metadata
                            );

                            ++exitRequestIndex;
                        }
                        // decrease surplus by the current amount regardless of hitting a specified exitRequest
                        surplus -= affordsForDestination;
                    }

                    updatedTargetOutcome[assetIndex] = Outcome.SingleAssetExit(
                        initialTargetOutcome[assetIndex].asset,
                        initialTargetOutcome[assetIndex].metadata,
                        targetAllocations
                    );

                    exit[assetIndex] = Outcome.SingleAssetExit(
                        initialTargetOutcome[assetIndex].asset,
                        initialTargetOutcome[assetIndex].metadata,
                        exitAllocations
                    );
                }
            }
        }
    }

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
    ) external override {
        (
            Outcome.SingleAssetExit[] memory outcome,
            address asset,
            uint256 initialAssetHoldings
        ) = _apply_transfer_checks(assetIndex, indices, fromChannelId, stateHash, outcomeBytes); // view

        (
            Outcome.Allocation[] memory newAllocations,
            ,
            Outcome.Allocation[] memory exitAllocations,
            uint256 totalPayouts
        ) = _compute_transfer_effects_and_interactions(
            initialAssetHoldings,
            outcome[assetIndex].allocations,
            indices
        ); // pure, also performs checks

        _apply_transfer_effects(
            assetIndex,
            asset,
            fromChannelId,
            stateHash,
            outcome,
            newAllocations,
            initialAssetHoldings,
            totalPayouts
        );

        _apply_transfer_interactions(outcome[assetIndex], exitAllocations); // in future, we may pass in the top-level metadata field too
    }

    function _apply_transfer_checks(
        uint256 assetIndex,
        uint256[] memory indices,
        bytes32 channelId,
        bytes32 stateHash,
        bytes memory outcomeBytes
    )
        internal
        view
        returns (
            Outcome.SingleAssetExit[] memory outcome,
            address asset,
            uint256 initialAssetHoldings
        )
    {
        _requireIncreasingIndices(indices); // This assumption is relied on by compute_transfer_effects_and_interactions
        _requireChannelFinalized(channelId);
        _requireMatchingFingerprint(stateHash, keccak256(outcomeBytes), channelId);

        outcome = Outcome.decodeExit(outcomeBytes);
        asset = outcome[assetIndex].asset;
        initialAssetHoldings = holdings[asset][channelId];
    }

    function _compute_transfer_effects_and_interactions(
        uint256 initialHoldings,
        Outcome.Allocation[] memory allocations,
        uint256[] memory indices
    )
        internal
        pure
        returns (
            Outcome.Allocation[] memory newAllocations,
            bool allocatesOnlyZeros,
            Outcome.Allocation[] memory exitAllocations,
            uint256 totalPayouts
        )
    {
        // `indices == []` means "pay out to all"
        // Note: by initializing payouts to be an array of fixed length, its entries are initialized to be `0`
        exitAllocations = new Outcome.Allocation[](
            indices.length > 0 ? indices.length : allocations.length
        );
        totalPayouts = 0;
        newAllocations = new Outcome.Allocation[](allocations.length);
        allocatesOnlyZeros = true; // switched to false if there is an item remaining with amount > 0
        uint256 surplus = initialHoldings; // tracks funds available during calculation
        uint256 k = 0; // indexes the `indices` array

        // loop over allocations and decrease surplus
        for (uint256 i = 0; i < allocations.length; i++) {
            // copy destination, allocationType and metadata parts
            newAllocations[i].destination = allocations[i].destination;
            newAllocations[i].allocationType = allocations[i].allocationType;
            newAllocations[i].metadata = allocations[i].metadata;
            // compute new amount part
            uint256 affordsForDestination = min(allocations[i].amount, surplus);
            if ((indices.length == 0) || ((k < indices.length) && (indices[k] == i))) {
                if (allocations[k].allocationType == uint8(Outcome.AllocationType.guarantee))
                    revert('cannot transfer a guarantee');
                // found a match
                // reduce the current allocationItem.amount
                newAllocations[i].amount = allocations[i].amount - affordsForDestination;
                // increase the relevant payout
                exitAllocations[k] = Outcome.Allocation(
                    allocations[i].destination,
                    affordsForDestination,
                    allocations[i].allocationType,
                    allocations[i].metadata
                );
                totalPayouts += affordsForDestination;
                // move on to the next supplied index
                ++k;
            } else {
                newAllocations[i].amount = allocations[i].amount;
            }
            if (newAllocations[i].amount != 0) allocatesOnlyZeros = false;
            // decrease surplus by the current amount if possible, else surplus goes to zero
            surplus -= affordsForDestination;
        }
    }

    function _apply_transfer_effects(
        uint256 assetIndex,
        address asset,
        bytes32 channelId,
        bytes32 stateHash,
        Outcome.SingleAssetExit[] memory outcome,
        Outcome.Allocation[] memory newAllocations,
        uint256 initialHoldings,
        uint256 totalPayouts
    ) internal {
        // update holdings
        holdings[asset][channelId] -= totalPayouts;

        // store fingerprint of modified outcome
        outcome[assetIndex].allocations = newAllocations;
        _updateFingerprint(channelId, stateHash, keccak256(abi.encode(outcome)));

        // emit the information needed to compute the new outcome stored in the fingerprint
        emit AllocationUpdated(channelId, assetIndex, initialHoldings);
    }

    function _apply_transfer_interactions(
        Outcome.SingleAssetExit memory singleAssetExit,
        Outcome.Allocation[] memory exitAllocations
    ) internal {
        // create a new tuple to avoid mutating singleAssetExit
        Outcome.executeSingleAssetExit(
            Outcome.SingleAssetExit(
                singleAssetExit.asset,
                singleAssetExit.metadata,
                exitAllocations
            )
        );
    }

    /**
     * @notice Transfers the given amount of this AssetHolders's asset type to a supplied ethereum address.
     * @dev Transfers the given amount of this AssetHolders's asset type to a supplied ethereum address.
     * @param destination ethereum address to be credited.
     * @param amount Quantity of assets to be transferred.
     */
    function _transferAsset(
        address asset,
        address payable destination,
        uint256 amount
    ) internal {
        if (asset == address(0)) {
            (bool success, ) = destination.call{value: amount}(''); //solhint-disable-line avoid-low-level-calls
            require(success, 'Could not transfer ETH');
        } else {
            IERC20(asset).transfer(destination, amount);
        }
    }

    /**
     * @notice Checks if a given destination is external (and can therefore have assets transferred to it) or not.
     * @dev Checks if a given destination is external (and can therefore have assets transferred to it) or not.
     * @param destination Destination to be checked.
     * @return True if the destination is external, false otherwise.
     */
    function _isExternalDestination(bytes32 destination) internal pure returns (bool) {
        return uint96(bytes12(destination)) == 0;
    }

    /**
     * @notice Converts an ethereum address to a nitro external destination.
     * @dev Converts an ethereum address to a nitro external destination.
     * @param participant The address to be converted.
     * @return The input address left-padded with zeros.
     */
    function _addressToBytes32(address participant) internal pure returns (bytes32) {
        return bytes32(uint256(participant));
    }

    /**
     * @notice Converts a nitro destination to an ethereum address.
     * @dev Converts a nitro destination to an ethereum address.
     * @param destination The destination to be converted.
     * @return The rightmost 160 bits of the input string.
     */
    function _bytes32ToAddress(bytes32 destination) internal pure returns (address payable) {
        return address(uint160(uint256(destination)));
    }

    // **************
    // Requirers
    // **************

    /**
     * @notice Checks that a given variables hash to the data stored on chain.
     * @dev Checks that a given variables hash to the data stored on chain.
     */
    function _requireMatchingFingerprint(
        bytes32 stateHash,
        bytes32 outcomeHash,
        bytes32 channelId
    ) internal view {
        (, , uint160 fingerprint) = _unpackStatus(channelId);
        require(
            fingerprint == _generateFingerprint(stateHash, outcomeHash),
            'incorrect fingerprint'
        );
    }

    /**
     * @notice Checks that a given channel is in the Finalized mode.
     * @dev Checks that a given channel is in the Finalized mode.
     * @param channelId Unique identifier for a channel.
     */
    function _requireChannelFinalized(bytes32 channelId) internal view {
        require(_mode(channelId) == ChannelMode.Finalized, 'Channel not finalized.');
    }

    function _updateFingerprint(
        bytes32 channelId,
        bytes32 stateHash,
        bytes32 outcomeHash
    ) internal {
        (uint48 turnNumRecord, uint48 finalizesAt, ) = _unpackStatus(channelId);

        bytes32 newStatus = _generateStatus(
            ChannelData(turnNumRecord, finalizesAt, stateHash, outcomeHash)
        );
        statusOf[channelId] = newStatus;
    }

    /**
     * @notice Checks that the supplied indices are strictly increasing.
     * @dev Checks that the supplied indices are strictly increasing. This allows us allows us to write a more efficient claim function.
     */
    function _requireIncreasingIndices(uint256[] memory indices) internal pure {
        for (uint256 i = 0; i + 1 < indices.length; i++) {
            require(indices[i] < indices[i + 1], 'Indices must be sorted');
        }
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? b : a;
    }
}
