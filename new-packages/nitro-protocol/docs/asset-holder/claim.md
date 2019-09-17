---
id: claim
title: claimAll
---

The claimAll method takes the funds escrowed against a guarantor channel, and attempts to transfer them to the beneficiaries of the target channel specified by the guarantor. The transfers are first attempted in a nonstandard priority order given by the guarantor, so that beneficiaries of underfunded channels may not receive a transfer, depending on their nonstandard priority. Full or partial transfers to a beneficiary results in deletion or reduction of that beneficiary's allocation (respectively). Surplus funds are then subject to another attempt to transfer them to the beneficiaries of the target channel, but this time with the standard priority order given by the target channel. Any funds that still remain after this step remain in escrow against the guarantor.

As with `transferAll`, a transfer to another channel results in explicit escrow of funds against that channel. A transfer to an external address results in ETH or ERC20 tokens being transferred out of the AssetHolder contract.

Signature:

```solidity
   function claimAll(
        bytes32 channelId,
        bytes calldata guaranteeBytes,
        bytes calldata allocationBytes
    ) external
```

## Implementation

In comparison to `transferAll`, in `claimAll` it is more difficult to track the unknown number of payouts and new `AllocationItems`. An array of payouts is initialized with the same length as the target channel's allocation. While the balance is positive, and for each destination in the guarantee, find the first occurrence of that destination in the target channel's allocation. If there is sufficient balance remaining, increase the payout and decrease the number of new allocation items. If there is insufficient balance remaining, assign all of it to a payout (and the balance becomes zero), decrease the amount in the allocation item, and do not decrease the number of new allocation items. With the remaining balance (if any) continue thus: While the balance remains positive, and for each item in the target channel's allocation, if there is sufficient balance remaining, increase the payout and decrease the number of new allocation items. If there is insufficient balance remaining, assign all of it to a payout (and the balance becomes zero), decrease the amount in the allocation item, and do not decrease the number of new allocation items.

Finally, update the holdings, compute the new allocation and update the storage, and execute the payouts.s

```solidity
function claimAll(
        bytes32 guarantorChannelId,
        bytes calldata guaranteeBytes,
        bytes calldata allocationBytes
    ) external {
        // requirements

        require(
            outcomeHashes[guarantorChannelId] ==
                keccak256(
                    abi.encode(
                        Outcome.LabelledAllocationOrGuarantee(
                            uint8(Outcome.OutcomeType.Guarantee),
                            guaranteeBytes
                        )
                    )
                ),
            'claimAll | submitted data does not match outcomeHash stored against guarantorChannellId'
        );

        Outcome.Guarantee memory guarantee = abi.decode(guaranteeBytes, (Outcome.Guarantee));

        require(
            outcomeHashes[guarantee.targetChannelId] ==
                keccak256(
                    abi.encode(
                        Outcome.LabelledAllocationOrGuarantee(
                            uint8(Outcome.OutcomeType.Allocation),
                            allocationBytes
                        )
                    )
                ),
            'claimAll | submitted data does not match outcomeHash stored against targetChannelId'
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
                            balance -= _amount;
                            allocation[j].amount = 0; // subtract _amount;
                            newAllocationLength--;
                            payouts[j] += _amount;
                            break;
                        } else {
                            allocation[j].amount = _amount - balance;
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
        for (uint256 j= 0; j < allocation.length; j++) {
            // for each entry in the target channel's outcome
            if (balance == 0) {
                break;
            }
            uint256 _amount = allocation[j].amount;
            if (_amount > 0) {
                if (balance >= _amount) {
                    balance -= _amount;
                    allocation[j].amount = 0; // subtract _amount;
                    newAllocationLength--;
                    payouts[j] += _amount;
                } else {
                    allocation[j].amount = _amount - balance;
                    payouts[j] += balance;
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
                if (_isExternalAddress(allocation[j].destination)) {
                    _transferAsset(_bytes32ToAddress(allocation[j].destination), payouts[j]);
                    emit AssetTransferred(allocation[j].destination, payouts[j]);
                } else {
                    holdings[allocation[j].destination] += payouts[j];
                }
            }

        }
        assert(k == newAllocationLength);

        if (newAllocationLength > 0) {
            // store hash
            outcomeHashes[guarantee.targetChannelId] = keccak256(
                abi.encode(
                    Outcome.LabelledAllocationOrGuarantee(
                        uint8(Outcome.OutcomeType.Allocation),
                        abi.encode(newAllocation)
                    )
                )
            );
        } else {
            delete outcomeHashes[guarantee.targetChannelId];
        }

    }
```
