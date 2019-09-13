---
id: claim
title: Claim
---

### ClaimAll

- First pays out according to the allocation of the `targetChannelId` but with priorities set by the guarantee.
- Pays any remaining funds out according to the default priorities.

`claimAll(bytes32 guarantorChannelId, bytes32 targetChannelId, bytes32[] destinations, AllocationItem[] allocation)`

- checks that `outcomes[guarantorChannelId]` is equal to `hash(1, (targetChannelId, destinations))`, where `1` signifies an outcome of type `GUARANTEE`
- checks that `outcomes[targetChannelId]` is equal to `hash(0, allocation)`
- `let balance = balances[guarantorChannelId]`
- k = 0
- let payouts = []
- for 0 <= i < destinations.length
  - let destination = destinations[i]
  - if balance == 0
    - break
  - for 0 <= j < allocation.length
    - if allocations[j].destination == destination
      - let amount = allocations[j].amount
      - if balance >= amount
        - payouts[k] = (destination, amount)
        - k++
        - balance -= amount
        - delete(allocations[j])
        - break
      - else
        - payouts[k] = (destination, balance)
        - k++
        - allocations[j].value = amount - balance
        - balance = 0
        - break
- // allocate the rest as in transferAll
- let newAllocation = []
- let j = 0
- for 0 <= i < allocation.length
  - let (destination, amount) = allocation[i]
  - if balance == 0
    - newAllocation[j] = (destination, amount)
    - j++
  - elsif balance <= amount
    - payouts[k] = (destination, balance)
    - k++
    - newAllocation[j] = (destination, amount - balance)
    - balance = 0
  - else
    - payouts[k] = (destination, amount)
    - k++
    - balance -= amount
- sets `balances[guarantorChannelId] = balance`
  - note: must do this before calling any external contracts to prevent re-entrancy bugs
- sets `outcomes[guarantorChannelId] = hash(newAllocation)` or clears if `newAllocation = []`
- for each payout
  - if payout is an external address
    - do an external transfer to the address
  - else
    - `balances[destination] += payout.amount`

* when can we delete the guarantee? only when the allocation has been deleted. but this means we can only delete one guarantee. So maybe just don't bother
