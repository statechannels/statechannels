// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../Outcome.sol';

contract OutcomeTransformations {
    // Outcome transformation functions (pure)

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
            Outcome.AllocationItem[] memory payOuts
        )
    {
        // `indices == []` means "pay out to all"
        // Note: by initializing payOuts to be an array of fixed length, its entries are initialized to be `0`
        newAllocation = new Outcome.AllocationItem[](allocation.length);
        payOuts = new Outcome.AllocationItem[](
            indices.length > 0 ? indices.length : allocation.length
        );
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
                        payOuts[k].destination = allocation[i].destination;
                        payOuts[k].amount += affordsForDestination;
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

    function _computeNewOutcomeAfterClaim(
        uint256[] memory initialHoldings,
        Outcome.OutcomeItem[] memory outcome,
        bytes32 targetChannelId,
        uint256[][] memory indices,
        Outcome.OutcomeItem[] memory guarantorOutcome
    )
        public
        pure
        returns (Outcome.OutcomeItem[] memory newOutcome, Outcome.OutcomeItem[] memory payOuts)
    {
        require(
            initialHoldings.length == indices.length && outcome.length == indices.length,
            'holdings/indices length mismatch'
        );
        require(outcome.length == guarantorOutcome.length, 'outcomes length mismatch');
        newOutcome = new Outcome.OutcomeItem[](outcome.length);
        payOuts = new Outcome.OutcomeItem[](outcome.length);
        // loop over tokens
        for (uint256 i = 0; i < outcome.length; i++) {
            require(
                outcome[i].assetHolderAddress == guarantorOutcome[i].assetHolderAddress,
                'mismatched assets'
            );
            Outcome.AssetOutcome memory assetOutcome = abi.decode(
                outcome[i].assetOutcomeBytes,
                (Outcome.AssetOutcome)
            );
            require(
                assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),
                'not an allocation'
            );
            Outcome.AssetOutcome memory gAssetOutcome = abi.decode(
                guarantorOutcome[i].assetOutcomeBytes,
                (Outcome.AssetOutcome)
            );
            require(
                gAssetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Guarantee),
                'not a guarantee'
            );
            Outcome.Guarantee memory guarantee = abi.decode(
                gAssetOutcome.allocationOrGuaranteeBytes,
                (Outcome.Guarantee)
            );
            require(guarantee.targetChannelId == targetChannelId, 'incorret target channel');
            Outcome.AllocationItem[] memory allocation = abi.decode(
                assetOutcome.allocationOrGuaranteeBytes,
                (Outcome.AllocationItem[])
            );
            (
                Outcome.AllocationItem[] memory newAllocation, // TODO make use of safeToDelete
                ,
                Outcome.AllocationItem[] memory payouts
            ) = _computeNewAllocationWithGuarantee(
                initialHoldings[i],
                allocation,
                indices[i],
                guarantee
            );

            newOutcome[i] = Outcome.OutcomeItem(
                outcome[i].assetHolderAddress,
                abi.encode(
                    Outcome.AssetOutcome(
                        uint8(Outcome.AssetOutcomeType.Allocation),
                        abi.encode(newAllocation)
                    )
                )
            );

            payOuts[i] = Outcome.OutcomeItem(
                outcome[i].assetHolderAddress,
                abi.encode(
                    Outcome.AssetOutcome(
                        uint8(Outcome.AssetOutcomeType.Allocation),
                        abi.encode(payouts)
                    )
                )
            );
        }
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? b : a;
    }
}
