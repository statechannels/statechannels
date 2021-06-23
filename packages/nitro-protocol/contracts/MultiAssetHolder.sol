// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import './Outcome.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/IAssetHolder.sol';

/**
 * @dev An implementation of the IAssetHolder interface. The AssetHolder contract escrows ETH or tokens against state channels. It allows assets to be internally accounted for, and ultimately prepared for transfer from one channel to other channel and/or external destinations, as well as for guarantees to be claimed. Note there is no deposit function and the _transferAsset function is unimplemented; inheriting contracts should implement these functions in a manner appropriate to the asset type (e.g. ETH or ERC20 tokens).
 */
contract MultiAssetHolder {
    using SafeMath for uint256;

    // TODO dedupe this (it is copied from IForceMove.sol)
    struct ChannelData {
        uint48 turnNumRecord;
        uint48 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        address challengerAddress;
        bytes32 outcomeHash;
    }

    address public AdjudicatorAddress;

    /**
     * holdings[asset][channelId] is the amount of asset asset held against channel channelId. 0 implies ETH
     */
    mapping(address => mapping(bytes32 => uint256)) public holdings;

    // **************
    // External methods
    // **************

    /**
     * @notice Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
     * @dev Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
     * @param fromChannelId Unique identifier for state channel to transfer funds *from*.
     * @param outcomeBytes The encoded Outcome of this state channel
     * @param indices Array with each entry denoting the index of a destination to transfer funds to. An empty array indicates "all".
     */
    function transfer(
        uint256 assetIndex, // TODO consider a uint48?
        bytes32 fromChannelId,
        bytes calldata outcomeBytes,
        bytes32 stateHash,
        address challengerAddress,
        uint256[] memory indices
    ) external {
        // checks
        _requireIncreasingIndices(indices);
        _requireChannelFinalized(fromChannelId);
        _requireMatchingFingerprint(
            stateHash,
            challengerAddress,
            keccak256(outcomeBytes),
            fromChannelId
        );

        Outcome.OutcomeItem[] memory outcome = abi.decode(outcomeBytes, (Outcome.OutcomeItem[]));
        Outcome.AssetOutcome memory assetOutcome = abi.decode(
            outcome[assetIndex].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        require(assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation));
        Outcome.AllocationItem[] memory allocation = abi.decode(
            assetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        address asset = outcome[assetIndex].assetHolderAddress;

        // effects and interactions
        _transfer(asset, fromChannelId, allocation, indices);
    }

    /**
     * @notice Transfers as many funds escrowed against `guarantorChannelId` as can be afforded for a specific destination in the beneficiaries of the __target__ of that channel. Checks against the storage in this contract.
     * @dev Transfers as many funds escrowed against `guarantorChannelId` as can be afforded for a specific destination in the beneficiaries of the __target__ of that channel. Checks against the storage in this contract.
     */
    function claim(
        uint256 assetIndex, // TODO consider a uint48?
        bytes32 guarantorChannelId,
        bytes memory guarantorOutcomeBytes,
        bytes32 guarantorStateHash,
        address guarantorChallengerAddress,
        bytes memory targetOutcomeBytes,
        bytes32 targetStateHash,
        address targetChallengerAddress,
        uint256[] memory indices
    ) public {
        // checks
        Outcome.Guarantee memory guarantee;
        address asset;
        {
            _requireIncreasingIndices(indices);
            _requireChannelFinalized(guarantorChannelId);
        }
        {
            bytes32 guarantorOutcomeHash = keccak256(guarantorOutcomeBytes);
            _requireMatchingFingerprint(
                guarantorStateHash,
                guarantorChallengerAddress,
                guarantorOutcomeHash,
                guarantorChannelId
            );
        }

        {
            Outcome.OutcomeItem[] memory outcome = abi.decode(
                guarantorOutcomeBytes,
                (Outcome.OutcomeItem[])
            );
            Outcome.AssetOutcome memory assetOutcome = abi.decode(
                outcome[assetIndex].assetOutcomeBytes,
                (Outcome.AssetOutcome)
            );
            require(assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Guarantee));
            guarantee = abi.decode(assetOutcome.allocationOrGuaranteeBytes, (Outcome.Guarantee));
            asset = outcome[assetIndex].assetHolderAddress;
        }
        {
            _requireChannelFinalized(guarantee.targetChannelId);
            _requireMatchingFingerprint(
                targetStateHash,
                targetChallengerAddress,
                keccak256(targetOutcomeBytes),
                guarantee.targetChannelId
            );
        }
        Outcome.AllocationItem[] memory allocation;
        {
            Outcome.OutcomeItem[] memory outcome = abi.decode(
                targetOutcomeBytes,
                (Outcome.OutcomeItem[])
            );
            Outcome.AssetOutcome memory assetOutcome = abi.decode(
                outcome[assetIndex].assetOutcomeBytes,
                (Outcome.AssetOutcome)
            );
            require(assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation));
            allocation = abi.decode(
                assetOutcome.allocationOrGuaranteeBytes,
                (Outcome.AllocationItem[])
            );
        }
        // effects and interactions
        _claim(asset, guarantorChannelId, guarantee, allocation, indices);
    }

    // **************
    // Internal methods
    // **************

    function _computeNewAllocationWithGuarantee(
        uint256 initialHoldings,
        Outcome.AllocationItem[] memory allocation,
        uint256[] memory indices,
        Outcome.Guarantee memory guarantee // TODO this could just accept guarantee.destinations ?
    )
        public
        pure
        returns (
            Outcome.AllocationItem[] memory newAllocation,
            bool safeToDelete,
            uint256[] memory payouts,
            uint256 totalPayouts
        )
    {
        // `indices == []` means "pay out to all"
        // Note: by initializing payouts to be an array of fixed length, its entries are initialized to be `0`
        payouts = new uint256[](indices.length > 0 ? indices.length : allocation.length);
        totalPayouts = 0;
        newAllocation = new Outcome.AllocationItem[](allocation.length);
        safeToDelete = true; // switched to false if there is an item remaining with amount > 0
        uint256 surplus = initialHoldings; // tracks funds available during calculation
        uint256 k = 0; // indexes the `indices` array

        // copy allocation
        for (uint256 i = 0; i < allocation.length; i++) {
            newAllocation[i].destination = allocation[i].destination;
            newAllocation[i].amount = allocation[i].amount;
        }

        // for each guarantee destination
        for (uint256 j = 0; j < guarantee.destinations.length; j++) {
            if (surplus == 0) break;
            for (uint256 i = 0; i < newAllocation.length; i++) {
                if (surplus == 0) break;
                // search for it in the allocation
                if (guarantee.destinations[j] == newAllocation[i].destination) {
                    // if we find it, compute new amount
                    uint256 affordsForDestination = min(allocation[i].amount, surplus);
                    // decrease surplus by the current amount regardless of hitting a specified index
                    surplus -= affordsForDestination;
                    if ((indices.length == 0) || ((k < indices.length) && (indices[k] == i))) {
                        // only if specified in supplied indices, or we if we are doing "all"
                        // reduce the new allocationItem.amount
                        newAllocation[i].amount -= affordsForDestination;
                        // increase the relevant payout
                        payouts[k] += affordsForDestination;
                        totalPayouts += affordsForDestination;
                        // move on to the next supplied index
                        ++k;
                    }
                    break; // start again with the next guarantee destination
                }
            }
        }

        for (uint256 i = 0; i < allocation.length; i++) {
            if (newAllocation[i].amount != 0) {
                safeToDelete = false;
                break;
            }
        }
    }

    function _computeNewAllocation(
        uint256 initialHoldings,
        Outcome.AllocationItem[] memory allocation,
        uint256[] memory indices
    )
        public
        pure
        returns (
            Outcome.AllocationItem[] memory newAllocation,
            bool safeToDelete,
            uint256[] memory payouts,
            uint256 totalPayouts
        )
    {
        // `indices == []` means "pay out to all"
        // Note: by initializing payouts to be an array of fixed length, its entries are initialized to be `0`
        payouts = new uint256[](indices.length > 0 ? indices.length : allocation.length);
        totalPayouts = 0;
        newAllocation = new Outcome.AllocationItem[](allocation.length);
        safeToDelete = true; // switched to false if there is an item remaining with amount > 0
        uint256 surplus = initialHoldings; // tracks funds available during calculation
        uint256 k = 0; // indexes the `indices` array

        // loop over allocations and decrease surplus
        for (uint256 i = 0; i < allocation.length; i++) {
            // copy destination part
            newAllocation[i].destination = allocation[i].destination;
            // compute new amount part
            uint256 affordsForDestination = min(allocation[i].amount, surplus);
            if ((indices.length == 0) || ((k < indices.length) && (indices[k] == i))) {
                // found a match
                // reduce the current allocationItem.amount
                newAllocation[i].amount = allocation[i].amount - affordsForDestination;
                // increase the relevant payout
                payouts[k] = affordsForDestination;
                totalPayouts += affordsForDestination;
                // move on to the next supplied index
                ++k;
            } else {
                newAllocation[i].amount = allocation[i].amount;
            }
            if (newAllocation[i].amount != 0) safeToDelete = false;
            // decrease surplus by the current amount if possible, else surplus goes to zero
            surplus -= affordsForDestination;
        }
    }

    /**
     * @notice Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries. Does not check allocationBytes against on chain storage.
     * @dev Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries. Does not check allocationBytes against on chain storage.
     * @param fromChannelId Unique identifier for state channel to transfer funds *from*.
     * @param allocation An AssetOutcome.AllocationItem[]
     * @param indices Array with each entry denoting the index of a destination to transfer funds to. Should be in increasing order. An empty array indicates "all".
     */
    function _transfer(
        address asset,
        bytes32 fromChannelId,
        Outcome.AllocationItem[] memory allocation,
        uint256[] memory indices
    ) internal {
        uint256 initialHoldings = holdings[asset][fromChannelId];

        (
            Outcome.AllocationItem[] memory newAllocation,
            bool safeToDelete,
            uint256[] memory payouts,
            uint256 totalPayouts
        ) = _computeNewAllocation(initialHoldings, allocation, indices);

        // *******
        // EFFECTS
        // *******

        holdings[asset][fromChannelId] = initialHoldings.sub(totalPayouts); // expect gas rebate if this is set to 0

        if (safeToDelete) {
            // TODO possibly delete the entire status for this channel, but only if safe
            // the motivation is a gas refund
        } else {
            // TODO updateFingerpint
        }

        // *******
        // INTERACTIONS
        // *******

        for (uint256 j = 0; j < payouts.length; j++) {
            if (payouts[j] > 0) {
                bytes32 destination = allocation[indices.length > 0 ? indices[j] : j].destination;
                // storage updated BEFORE external contracts called (prevent reentrancy attacks)
                if (_isExternalDestination(destination)) {
                    _transferAsset(asset, _bytes32ToAddress(destination), payouts[j]);
                } else {
                    holdings[asset][destination] += payouts[j];
                }
            }
        }
        // TODO emit OutcomeUpdated(fromChannelId, initialHoldings);
    }

    /**
     * @notice Transfers as many funds escrowed against `guarantorChannelId` as can be afforded for a specific destination in the beneficiaries of the __target__ of that channel.  Does not check allocationBytes or guarantee against on chain storage.
     * @dev Transfers as many funds escrowed against `guarantorChannelId` as can be afforded for a specific destination in the beneficiaries of the __target__ of that channel.  Does not check allocationBytes or guarantee against on chain storage.
     */
    function _claim(
        address asset,
        bytes32 guarantorChannelId,
        Outcome.Guarantee memory guarantee,
        Outcome.AllocationItem[] memory allocation,
        uint256[] memory indices
    ) internal {
        uint256 initialHoldings = holdings[asset][guarantorChannelId];

        (
            Outcome.AllocationItem[] memory newAllocation,
            bool safeToDelete,
            uint256[] memory payouts,
            uint256 totalPayouts
        ) = _computeNewAllocationWithGuarantee(initialHoldings, allocation, indices, guarantee);

        // *******
        // EFFECTS
        // *******

        holdings[asset][guarantorChannelId] = initialHoldings.sub(totalPayouts); // expect gas rebate if this is set to 0

        if (safeToDelete) {
            // TODO possibly
            //  delete the entire status for the guarantor, but only if safe
            //  delete the entire status for the target, but only if safe
            // the motivation is a gas refund
        } else {
            // TODO updateFingerpint for guarantor
            // TODO updateFingerpint for target
        }

        // *******
        // INTERACTIONS
        // *******

        for (uint256 j = 0; j < payouts.length; j++) {
            if (payouts[j] > 0) {
                bytes32 destination = allocation[indices.length > 0 ? indices[j] : j].destination;
                // storage updated BEFORE external contracts called (prevent reentrancy attacks)
                if (_isExternalDestination(destination)) {
                    _transferAsset(asset, _bytes32ToAddress(destination), payouts[j]);
                } else {
                    holdings[asset][destination] += payouts[j];
                }
            }
        }
        // TODO emit OutcomeUpdated(guarantorChannelId, initialHoldings);
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
            destination.transfer(amount);
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
     * @notice Checks that a given channel is in the Finalized mode.
     * @dev Checks that a given channel is in the Challenge mode.
     * @param channelId Unique identifier for a channel.
     */
    function _requireChannelFinalized(bytes32 channelId) internal virtual view {}

    /**
     * @notice Unpacks turnNumRecord, finalizesAt and fingerprint from the status of a particular channel.
     * @dev Unpacks turnNumRecord, finalizesAt and fingerprint from the status of a particular channel.
     * @param channelId Unique identifier for a state channel.
     * @return turnNumRecord A turnNum that (the adjudicator knows) is supported by a signature from each participant.
     * @return finalizesAt The unix timestamp when `channelId` will finalize.
     * @return fingerprint The last 160 bits of kecca256(stateHash, challengerAddress, outcomeHash)
     */
    function _unpackStatus(bytes32 channelId)
        internal
        virtual
        view
        returns (
            uint48 turnNumRecord,
            uint48 finalizesAt,
            uint160 fingerprint
        )
    {}

    function _generateFingerpint(
        bytes32 stateHash,
        address challengerAddress,
        bytes32 outcomeHash
    ) internal virtual pure returns (uint160) {}

    /**
     * @notice Checks that a given variables hash to the data stored on chain.
     * @dev Checks that a given variables hash to the data stored on chain.
     */
    function _requireMatchingFingerprint(
        bytes32 stateHash,
        address challengerAddress,
        bytes32 outcomeHash,
        bytes32 channelId
    ) internal view {
        (, , uint160 fingerprint) = _unpackStatus(channelId);
        require(fingerprint == _generateFingerpint(stateHash, challengerAddress, outcomeHash));
    }

    function _requireIncreasingIndices(uint256[] memory indices) internal pure {
        for (uint256 i = 0; i + 1 < indices.length; i++) {
            require(indices[i] < indices[i + 1], 'Indices must be sorted');
        }
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? b : a;
    }
}
