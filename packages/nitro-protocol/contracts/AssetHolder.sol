// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
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

    /**
     * @notice Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries. Performs no checks.
     * @dev Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries. Performs no checks.
     * @param fromChannelId Unique identifier for state channel to transfer funds *from*.
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation
     * @param destination External destination or channel to transfer funds *to*.
     */
    function _transfer(bytes32 fromChannelId, bytes memory allocationBytes, bytes32 destination) internal {
        Outcome.AllocationItem[] memory allocation = abi.decode(
            allocationBytes,
            (Outcome.AllocationItem[])
        );
        uint256 balance = holdings[fromChannelId];
        uint256 affordsForDestination;
        uint256 residualAllocationAmount;
        uint256 _amount;
        uint256 i;
        bool deleteHash = false;

        // loop over allocations and decrease balance until we hit the specified destination
        for (i = 0; i < allocation.length; i++) {
            if (balance == 0) {
                revert('_transfer | fromChannel affords 0 for destination');
            }
            _amount = allocation[i].amount;
            if (allocation[i].destination == destination) {
                 if (balance < _amount) {
                    affordsForDestination = balance;
                    residualAllocationAmount = _amount - balance;
                    balance = 0;
                } else {
                    affordsForDestination = _amount;
                    residualAllocationAmount = 0;
                    balance = balance.sub(_amount);
                }
            break; // means that i holds the index of the destination that may need to be altered or removed
            }
            if (balance < _amount) {
                balance = 0;
            } else {
                balance = balance.sub(_amount);
            }
        }

        // effects
        holdings[fromChannelId] -= affordsForDestination;

        // construct new outcome

        bytes memory encodedAllocation; 

        if (residualAllocationAmount > 0) {
            // new allocation identical save for a single entry 
            Outcome.AllocationItem[] memory newAllocation = new Outcome.AllocationItem[](
                allocation.length
            );
            for (uint256 k = 0; k < allocation.length; k++) {
                newAllocation[k] = allocation[k];
                if (allocation[k].destination == destination) {
                    newAllocation[k].amount = residualAllocationAmount;
                }
            }
            encodedAllocation = abi.encode(newAllocation);
        }

        if (residualAllocationAmount == 0) {
            Outcome.AllocationItem[] memory splicedAllocation = new Outcome.AllocationItem[](
                allocation.length - 1
            );
            // full payout so we want to splice a shorter outcome
            for (uint256 k = 0; k < i; k++) {
                splicedAllocation[k] = allocation[k];
            }
            for (uint256 k = i + 1; k < allocation.length; k++) {
                splicedAllocation[k - 1] = allocation[k];
            }
            if (splicedAllocation.length == 0) {
                deleteHash = true;
            }
            encodedAllocation = abi.encode(splicedAllocation);
        }

        // replace or delete hash
        if (deleteHash) {
            delete assetOutcomeHashes[fromChannelId];
        } else {
            assetOutcomeHashes[fromChannelId] = keccak256(
                abi.encode(
                    Outcome.AssetOutcome(
                        uint8(Outcome.AssetOutcomeType.Allocation),
                        encodedAllocation
                    )
                )
            );
        } 

        // storage updated BEFORE asset transferred (prevent reentrancy)

        if (_isExternalDestination(destination)) {
            _transferAssetAndEmitIfSuccessful(fromChannelId, _bytes32ToAddress(destination), affordsForDestination);
        } else {
            holdings[destination] += affordsForDestination;
        }
        
    }

    /**
     * @notice Transfers the funds escrowed against `channelId` to the beneficiaries of that channel. No checks performed.
     * @dev Transfers the funds escrowed against `channelId` and transfers them to the beneficiaries of that channel. No checks performed.
     * @param channelId Unique identifier for a state channel.
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation
     */
    function _transferAll(bytes32 channelId, bytes memory allocationBytes) internal {
        Outcome.AllocationItem[] memory allocation = abi.decode(
            allocationBytes,
            (Outcome.AllocationItem[])
        );
        uint256 balance = holdings[channelId];
        uint256 numPayouts = 0;
        uint256 numNewAllocationItems = allocation.length;
        uint256 _amount;
        bool overlap;
        uint256 finalPayoutAmount;
        uint256 firstNewAllocationItemAmount;

        for (uint256 i = 0; i < allocation.length; i++) {
            if (balance == 0) {
                // if funds are completely depleted, keep the allocationItem and do not pay out
            } else {
                _amount = allocation[i].amount;
                if (balance < _amount) {
                    // if funds still exist but are insufficient for this allocationItem, payout what's available and keep the allocationItem (but reduce the amount allocated)
                    // this block is never executed more than once
                    numPayouts++;
                    overlap = true;
                    finalPayoutAmount = balance;
                    firstNewAllocationItemAmount = _amount.sub(balance);
                    balance = 0;
                } else {
                    // if ample funds still exist, pay them out and discard the allocationItem
                    numPayouts++;
                    numNewAllocationItems = numNewAllocationItems.sub(1);
                    balance = balance.sub(_amount);
                }
            }
        }

        // effects
        holdings[channelId] = balance;

        if (numNewAllocationItems > 0) {
            // construct newAllocation
            Outcome.AllocationItem[] memory newAllocation = new Outcome.AllocationItem[](
                numNewAllocationItems
            );
            for (uint256 k = 0; k < numNewAllocationItems; k++) {
                newAllocation[k] = allocation[allocation.length.sub(numNewAllocationItems).add(k)];
                if (overlap && k == 0) {
                    newAllocation[k].amount = firstNewAllocationItemAmount;
                }
            }

            // store hash
            assetOutcomeHashes[channelId] = keccak256(
                abi.encode(
                    Outcome.AssetOutcome(
                        uint8(Outcome.AssetOutcomeType.Allocation),
                        abi.encode(newAllocation)
                    )
                )
            );
        } else {
            delete assetOutcomeHashes[channelId];
        }
        // holdings updated BEFORE asset transferred (prevent reentrancy)
        uint256 payoutAmount;
        for (uint256 m = 0; m < numPayouts; m++) {
            if (overlap && m == numPayouts.sub(1)) {
                payoutAmount = finalPayoutAmount;
            } else {
                payoutAmount = allocation[m].amount;
            }
            if (_isExternalDestination(allocation[m].destination)) {
                _transferAssetAndEmitIfSuccessful(channelId, _bytes32ToAddress(allocation[m].destination), payoutAmount);
            } else {
                holdings[allocation[m].destination] += payoutAmount;
            }
        }
    }



    // **************
    // Public methods
    // **************

    /**
     * @notice Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
     * @dev Transfers as many funds escrowed against `channelId` as can be afforded for a specific destination. Assumes no repeated entries.
     * @param fromChannelId Unique identifier for state channel to transfer funds *from*.
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation
     * @param destination External destination or channel to transfer funds *to*.
     */
    function transfer(bytes32 fromChannelId, bytes memory allocationBytes, bytes32 destination) public {
        // checks
        require(
            assetOutcomeHashes[fromChannelId] ==
                keccak256(
                    abi.encode(
                        Outcome.AssetOutcome(
                            uint8(Outcome.AssetOutcomeType.Allocation),
                            allocationBytes
                        )
                    )
                ),
            'transfer | submitted data does not match stored assetOutcomeHash'
        );
        _transfer(fromChannelId, allocationBytes, destination);
    }

    /**
     * @notice Transfers the funds escrowed against `channelId` to the beneficiaries of that channel. Checks against the storage in this contract.
     * @dev Transfers the funds escrowed against `channelId` and transfers them to the beneficiaries of that channel. Checks against the storage in this contract.
     * @param channelId Unique identifier for a state channel.
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation
     */
    function transferAll(bytes32 channelId, bytes memory allocationBytes) public override {
        // checks
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
            'transferAll | submitted data does not match stored assetOutcomeHash'
        );
        _transferAll(channelId, allocationBytes);
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
        _transferAll(channelId, allocationBytes);
    }

    /**
     * @notice Transfers the funds escrowed against `guarantorChannelId` to the beneficiaries of the __target__ of that channel.
     * @dev Transfers the funds escrowed against `guarantorChannelId` to the beneficiaries of the __target__ of that channel.
     * @param guarantorChannelId Unique identifier for a guarantor state channel.
     * @param guaranteeBytes The abi.encode of Outcome.Guarantee
     * @param allocationBytes The abi.encode of AssetOutcome.Allocation for the __target__
     */
    function claimAll(
        bytes32 guarantorChannelId,
        bytes memory guaranteeBytes,
        bytes memory allocationBytes
    ) public override {
        // checks

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
            'claimAll | submitted data does not match assetOutcomeHash stored against guarantorChannelId'
        );

        Outcome.Guarantee memory guarantee = abi.decode(guaranteeBytes, (Outcome.Guarantee));

        require(
            assetOutcomeHashes[guarantee.targetChannelId] ==
                keccak256(
                    abi.encode(
                        Outcome.AssetOutcome(
                            uint8(Outcome.AssetOutcomeType.Allocation),
                            allocationBytes
                        )
                    )
                ),
            'claimAll | submitted data does not match assetOutcomeHash stored against targetChannelId'
        );

        uint256 balance = holdings[guarantorChannelId];

        Outcome.AllocationItem[] memory allocation = abi.decode(
            allocationBytes,
            (Outcome.AllocationItem[])
        ); // this remains constant length

        uint256[] memory payouts = new uint256[](allocation.length);
        uint256 newAllocationLength = allocation.length;

        // first increase payouts according to guarantee
        for (uint256 i = 0; i < guarantee.destinations.length; i++) {
            // for each destination in the guarantee
            bytes32 _destination = guarantee.destinations[i];
            for (uint256 j = 0; j < allocation.length; j++) {
                if (balance == 0) {
                    break;
                }
                if (_destination == allocation[j].destination) {
                    // find amount allocated to that destination (if it exists in channel alllocation)
                    uint256 _amount = allocation[j].amount;
                    if (_amount > 0) {
                        if (balance >= _amount) {
                            balance = balance.sub(_amount);
                            allocation[j].amount = 0; // subtract _amount;
                            newAllocationLength = newAllocationLength.sub(1);
                            payouts[j] += _amount;
                            break;
                        } else {
                            allocation[j].amount = _amount.sub(balance);
                            payouts[j] += balance;
                            balance = 0;
                            break;
                        }
                    }
                }
            }
        }

        // next, increase payouts according to original allocation order
        // this block only has an effect if balance > 0
        for (uint256 j = 0; j < allocation.length; j++) {
            // for each entry in the target channel's outcome
            if (balance == 0) {
                break;
            }
            uint256 _amount = allocation[j].amount;
            if (_amount > 0) {
                if (balance >= _amount) {
                    balance = balance.sub(_amount);
                    allocation[j].amount = 0; // subtract _amount;
                    newAllocationLength = newAllocationLength.sub(1);
                    payouts[j]+= _amount;
                } else {
                    allocation[j].amount = _amount.sub(balance);
                    payouts[j]+= balance;
                    balance = 0;
                }
            }
        }

        // effects
        holdings[guarantorChannelId] = balance;

        // at this point have payouts array of uint256s, each corresponding to original destinations
        // and allocations has some zero amounts which we want to prune
        Outcome.AllocationItem[] memory newAllocation;
        if (newAllocationLength > 0) {
            newAllocation = new Outcome.AllocationItem[](newAllocationLength);
        }

        uint256 k = 0;
        for (uint256 j = 0; j < allocation.length; j++) {
            // for each destination in the target channel's allocation
            if (allocation[j].amount > 0) {
                newAllocation[k] = allocation[j];
                k++;
            }
            if (payouts[j] > 0) {
                if (_isExternalDestination(allocation[j].destination)) {
                    _transferAssetAndEmitIfSuccessful(guarantorChannelId, _bytes32ToAddress(allocation[j].destination), payouts[j]);
                } else {
                    holdings[allocation[j].destination] += payouts[j];
                }
            }
        }
        assert(k == newAllocationLength);

        if (newAllocationLength > 0) {
            // store hash
            assetOutcomeHashes[guarantee.targetChannelId] = keccak256(
                abi.encode(
                    Outcome.AssetOutcome(
                        uint8(Outcome.AssetOutcomeType.Allocation),
                        abi.encode(newAllocation)
                    )
                )
            );
        } else {
            delete assetOutcomeHashes[guarantee.targetChannelId];
        }
    }

    // **************
    // Permissioned methods
    // **************

    modifier AdjudicatorOnly {
        require(msg.sender == AdjudicatorAddress, 'Only the NitroAdjudicator is authorized');
        _;
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
     * @notice Sets the given assetOutcomeHash for the given channelId in the assetOutcomeHashes storage mapping.
     * @dev Sets the given assetOutcomeHash for the given channelId in the assetOutcomeHashes storage mapping.
     * @param channelId Unique identifier for a state channel.
     * @param assetOutcomeHash The keccak256 of the abi.encode of the Outcome.
     */
    function setAssetOutcomeHash(bytes32 channelId, bytes32 assetOutcomeHash)
        external
        AdjudicatorOnly
        returns (bool success)
    {
        _setAssetOutcomeHash(channelId, assetOutcomeHash);
        return true;
    }

    // **************
    // Internal methods
    // **************

    /**
     * @notice Attempts to ransfersthe given amount of this AssetHolders's asset type to a supplied ethereum address, and emits an event if successful.
     * @dev Attempts to ransfersthe given amount of this AssetHolders's asset type to a supplied ethereum address, and emits an event if successful.
     * @param destination ethereum address to be credited.
     * @param amount Quantity of assets to be transferred.
     * @return True if the asset was successfully transferred, false otherwise.
     */
    function _transferAssetAndEmitIfSuccessful(bytes32 channelId, address payable destination, uint256 amount) internal virtual returns (bool) {
        if (_transferAsset(destination, amount)) {
            emit AssetTransferred(channelId, destination, amount);
        }
    }

    /**
     * @notice Transfers the given amount of this AssetHolders's asset type to a supplied ethereum address.
     * @dev Transfers the given amount of this AssetHolders's asset type to a supplied ethereum address.
     * @param destination ethereum address to be credited.
     * @param amount Quantity of assets to be transferred.
     * @return True if the asset was successfully transferred, false otherwise.
     */
    function _transferAsset(address payable destination, uint256 amount) internal virtual returns (bool) {}

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
}
