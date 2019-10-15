---
id: claim
title: claimAll
---

The claimAll method takes the funds escrowed against a guarantor channel, and attempts to transfer them to the beneficiaries of the target channel specified by the guarantor. The transfers are first attempted in a nonstandard priority order given by the guarantor, so that beneficiaries of underfunded channels may not receive a transfer, depending on their nonstandard priority. Full or partial transfers to a beneficiary results in deletion or reduction of that beneficiary's allocation (respectively). Surplus funds are then subject to another attempt to transfer them to the beneficiaries of the target channel, but this time with the standard priority order given by the target channel. Any funds that still remain after this step remain in escrow against the guarantor.

As with `transferAll`, a transfer to another channel results in explicit escrow of funds against that channel. A transfer to an external destination results in ETH or ERC20 tokens being transferred out of the AssetHolder contract.

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

Finally, update the holdings, compute the new allocation and update the storage, and execute the payouts.
