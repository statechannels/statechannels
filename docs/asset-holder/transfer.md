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
