---
id: transfer
title: transferAll
---

The transferAll method takes the funds escrowed against a channel, and attempts to transfer them to the beneficiaries of that channel. The transfers are attempted in priority order, so that beneficiaries of underfunded channels may not receive a transfer, depending on their priority. Surplus funds remain in escrow against the channel. Full or partial transfers to a beneficiary results in deletion or reduction of that beneficiary's allocation (respectively). A transfer to another channel results in explicit escrow of funds against that channel. A transfer to an external address results in ETH or ERC20 tokens being transferred out of the AssetHolder contract.

```solidity
function transferAll(bytes32 channelId, bytes calldata allocationBytes) external
```

## Implementation

This algorithm works by counting the number of `AllocationItems` that are to be completely converted into payouts. The remaining `AllocationItems` will be stored in a new `Allocation` and the storage mapping updated. There can be at most a single item that is a partial payout -- in this case the appropriately modified `AllocationItem` is also preserved. This is called the 'overlap' case.

```solidity
 function transferAll(bytes32 channelId, bytes calldata allocationBytes) external {
        // requirements
        require(
            outcomeHashes[channelId] ==
                keccak256(
                    abi.encode(
                        Outcome.AssetOutcome(
                            uint8(Outcome.AssetOutcomeType.Allocation),
                            allocationBytes
                        )
                    )
                ),
            'transferAll | submitted data does not match stored outcomeHash'
        );

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
                    firstNewAllocationItemAmount = _amount - balance;
                    balance = 0;
                } else {
                    // if ample funds still exist, pay them out and discard the allocationItem
                    numPayouts++;
                    numNewAllocationItems--;
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
                newAllocation[k] = allocation[allocation.length - numNewAllocationItems + k];
                if (overlap && k == 0) {
                    newAllocation[k].amount = firstNewAllocationItemAmount;
                }
            }

            // store hash
            outcomeHashes[channelId] = keccak256(
                abi.encode(
                    Outcome.AssetOutcome(
                        uint8(Outcome.AssetOutcomeType.Allocation),
                        abi.encode(newAllocation)
                    )
                )
            );
        } else {
            delete outcomeHashes[channelId];
        }

        // holdings updated BEFORE asset transferred (prevent reentrancy)
        uint256 payoutAmount;
        for (uint256 m = 0; m < numPayouts; m++) {
            if (overlap && m == numPayouts - 1) {
                payoutAmount = finalPayoutAmount;
            } else {
                payoutAmount = allocation[m].amount;
            }
            if (_isExternalAddress(allocation[m].destination)) {
                _transferAsset(_bytes32ToAddress(allocation[m].destination), payoutAmount);
                emit AssetTransferred(allocation[m].destination, payoutAmount);
            } else {
                holdings[allocation[m].destination] += payoutAmount;
            }
        }

    }
```
