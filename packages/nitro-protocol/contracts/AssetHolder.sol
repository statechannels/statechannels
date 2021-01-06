// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import './Outcome.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import './interfaces/IAssetHolder.sol';

/**
 * @dev An implementation of the IAssetHolder interface. The AssetHolder contract escrows ETH or tokens against state channels. It allows assets to be internally accounted for, and ultimately prepared for transfer from one channel to other channel and/or external destinations, as well as for guarantees to be claimed. Note there is no deposit function and the _transferAsset function is unimplemented; inheriting contracts should implement these functions in a manner appropriate to the asset type (e.g. ETH or ERC20 tokens).
 */
contract AssetHolder is IAssetHolder {
    using SafeMath for uint256;

    address public AdjudicatorAddress;

    mapping(bytes32 => uint256) public holdings;

    mapping(bytes32 => bytes32) public assetOutcomeHashes;

    // **************
    // External methods
    // **************

    /**
     * @notice Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
     * @dev Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
     * @param fromChannelId Unique identifier for state channel to transfer funds *from*.
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation
     * @param indices Array with each entry denoting the index of a destination to transfer funds to. An empty array indicates "all".
     */
    function transfer(
        bytes32 fromChannelId,
        bytes calldata allocationBytes,
        uint256[] memory indices
    ) external override {
        // checks
        _requireIncreasingIndices(indices);
        _requireCorrectAllocationHash(fromChannelId, allocationBytes);
        // effects and interactions
        _transfer(fromChannelId, allocationBytes, indices);
    }

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
    ) external {
        // checks
        _requireIncreasingIndices(indices);
        _requireCorrectGuaranteeHash(guarantorChannelId, guaranteeBytes);
        Outcome.Guarantee memory guarantee = abi.decode(guaranteeBytes, (Outcome.Guarantee));
        _requireCorrectAllocationHash(guarantee.targetChannelId, allocationBytes);
        // effects and interactions
        _claim(guarantorChannelId, guarantee, allocationBytes, indices);
    }

    // **************
    // Permissioned methods
    // **************

    modifier AdjudicatorOnly {
        require(msg.sender == AdjudicatorAddress, 'Only NitroAdjudicator authorized');
        _;
    }

    /**
     * @notice Transfers the funds escrowed against `channelId` to the beneficiaries of that channel. No checks performed against storage in this contract. Permissioned.
     * @dev Transfers the funds escrowed against `channelId` and transfers them to the beneficiaries of that channel. No checks performed against storage in this contract. Permissioned.
     * @param channelId Unique identifier for a state channel.
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation
     */
    function transferAllAdjudicatorOnly(bytes32 channelId, bytes calldata allocationBytes)
        external
        virtual
        AdjudicatorOnly
    {
        // no checks
        //
        // effects and interactions
        _transfer(channelId, allocationBytes, new uint256[](0));
    }

    /**
     * @notice Sets the given assetOutcomeHash for the given channelId in the assetOutcomeHashes storage mapping.
     * @dev Sets the given assetOutcomeHash for the given channelId in the assetOutcomeHashes storage mapping.
     * @param channelId Unique identifier for a state channel.
     * @param assetOutcomeHash The keccak256 of the abi.encode of the Outcome.
     */
    function setAssetOutcomeHash(bytes32 channelId, bytes32 assetOutcomeHash)
        external
        AdjudicatorOnly
    {
        _setAssetOutcomeHash(channelId, assetOutcomeHash);
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
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation
     * @param indices Array with each entry denoting the index of a destination to transfer funds to. Should be in increasing order. An empty array indicates "all".
     */
    function _transfer(
        bytes32 fromChannelId,
        bytes memory allocationBytes,
        uint256[] memory indices
    ) internal {
        Outcome.AllocationItem[] memory allocation = abi.decode(
            allocationBytes,
            (Outcome.AllocationItem[])
        );
        uint256 initialHoldings = holdings[fromChannelId];

        (
            Outcome.AllocationItem[] memory newAllocation,
            bool safeToDelete,
            uint256[] memory payouts,
            uint256 totalPayouts
        ) = _computeNewAllocation(initialHoldings, allocation, indices);

        // *******
        // EFFECTS
        // *******

        holdings[fromChannelId] = initialHoldings.sub(totalPayouts); // expect gas rebate if this is set to 0

        if (safeToDelete) {
            delete assetOutcomeHashes[fromChannelId];
        } else {
            assetOutcomeHashes[fromChannelId] = keccak256(
                abi.encode(
                    Outcome.AssetOutcome(
                        uint8(Outcome.AssetOutcomeType.Allocation),
                        abi.encode(newAllocation)
                    )
                )
            );
        }

        // *******
        // INTERACTIONS
        // *******

        for (uint256 j = 0; j < payouts.length; j++) {
            if (payouts[j] > 0) {
                bytes32 destination = allocation[indices.length > 0 ? indices[j] : j].destination;
                // storage updated BEFORE external contracts called (prevent reentrancy attacks)
                if (_isExternalDestination(destination)) {
                    _transferAsset(_bytes32ToAddress(destination), payouts[j]);
                } else {
                    holdings[destination] += payouts[j];
                }
            }
        }
        emit AllocationUpdated(fromChannelId, initialHoldings);
    }

    /**
     * @notice Transfers as many funds escrowed against `guarantorChannelId` as can be afforded for a specific destination in the beneficiaries of the __target__ of that channel.  Does not check allocationBytes or guarantee against on chain storage.
     * @dev Transfers as many funds escrowed against `guarantorChannelId` as can be afforded for a specific destination in the beneficiaries of the __target__ of that channel.  Does not check allocationBytes or guarantee against on chain storage.
     * @param guarantorChannelId Unique identifier for a guarantor state channel.
     * @param guarantee The guarantee
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation for the __target__
     * @param indices Array with each entry denoting the index of a destination (in the target channel) to transfer funds to. An empty array indicates "all".
     */
    function _claim(
        bytes32 guarantorChannelId,
        Outcome.Guarantee memory guarantee,
        bytes memory allocationBytes,
        uint256[] memory indices
    ) internal {
        Outcome.AllocationItem[] memory allocation = abi.decode(
            allocationBytes,
            (Outcome.AllocationItem[])
        );
        uint256 initialHoldings = holdings[guarantorChannelId];

        (
            Outcome.AllocationItem[] memory newAllocation,
            bool safeToDelete,
            uint256[] memory payouts,
            uint256 totalPayouts
        ) = _computeNewAllocationWithGuarantee(initialHoldings, allocation, indices, guarantee);

        // *******
        // EFFECTS
        // *******

        holdings[guarantorChannelId] = initialHoldings.sub(totalPayouts); // expect gas rebate if this is set to 0

        if (safeToDelete) {
            delete assetOutcomeHashes[guarantorChannelId];
            delete assetOutcomeHashes[guarantee.targetChannelId];
        } else {
            assetOutcomeHashes[guarantee.targetChannelId] = keccak256(
                abi.encode(
                    Outcome.AssetOutcome(
                        uint8(Outcome.AssetOutcomeType.Allocation),
                        abi.encode(newAllocation)
                    )
                )
            );
        }

        // *******
        // INTERACTIONS
        // *******

        for (uint256 j = 0; j < payouts.length; j++) {
            if (payouts[j] > 0) {
                bytes32 destination = allocation[indices.length > 0 ? indices[j] : j].destination;
                // storage updated BEFORE external contracts called (prevent reentrancy attacks)
                if (_isExternalDestination(destination)) {
                    _transferAsset(_bytes32ToAddress(destination), payouts[j]);
                } else {
                    holdings[destination] += payouts[j];
                }
            }
        }
        emit AllocationUpdated(guarantorChannelId, initialHoldings);
    }

    /**
     * @notice Sets the given assetOutcomeHash for the given channelId in the assetOutcomeHashes storage mapping
     * @dev Sets the given assetOutcomeHash for the given channelId in the assetOutcomeHashes storage mapping
     * @param channelId Unique identifier for a state channel.
     * @param assetOutcomeHash The keccak256 of the abi.encode of the Outcome.
     */
    function _setAssetOutcomeHash(bytes32 channelId, bytes32 assetOutcomeHash) internal {
        require(assetOutcomeHashes[channelId] == bytes32(0), 'Outcome hash already exists');
        assetOutcomeHashes[channelId] = assetOutcomeHash;
    }

    /**
     * @notice Transfers the given amount of this AssetHolders's asset type to a supplied ethereum address.
     * @dev Transfers the given amount of this AssetHolders's asset type to a supplied ethereum address.
     * @param destination ethereum address to be credited.
     * @param amount Quantity of assets to be transferred.
     */
    function _transferAsset(address payable destination, uint256 amount) internal virtual {} // solhint-disable-line no-empty-blocks

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

    function _requireCorrectAllocationHash(bytes32 channelId, bytes memory allocationBytes)
        internal
        view
    {
        require(
            assetOutcomeHashes[channelId] ==
                keccak256(
                    abi.encode(
                        Outcome.AssetOutcome(
                            uint8(Outcome.AssetOutcomeType.Allocation),
                            allocationBytes
                        )
                    )
                ),
            'h(allocation)!=assetOutcomeHash'
        );
    }

    function _requireCorrectGuaranteeHash(bytes32 guarantorChannelId, bytes memory guaranteeBytes)
        internal
        view
    {
        require(
            assetOutcomeHashes[guarantorChannelId] ==
                keccak256(
                    abi.encode(
                        Outcome.AssetOutcome(
                            uint8(Outcome.AssetOutcomeType.Guarantee),
                            guaranteeBytes
                        )
                    )
                ),
            'h(guarantee)!=assetOutcomeHash'
        );
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
