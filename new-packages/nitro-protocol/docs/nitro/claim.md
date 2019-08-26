---
id: claim
title: Claim
---

### ClaimAll

- First pays out according to the allocation of the `guaranteedAddress` but with priorities set by the guarantee.
- Pays any remaining funds out according to the default priorities.

`claimAll(bytes32 channelAddress, bytes32 guaranteedAddress, bytes32[] destinations, AllocationItem[] allocation)`

- checks that `outcomes[channelAddress]` is equal to `hash(GUARANTEE, (guaranteedAddress, destinations))`
- checks that `outcomes[guaranteedAddress]` is equal to `hash(ALLOCATION, allocation)`
- `let balance = balances[channelAddress]`
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
- sets `balances[channelAddress] = balance`
  - note: must do this before calling any external contracts to prevent re-entrancy bugs
- sets `outcomes[channelAddress] = hash(newAllocation)` or clears if `newAllocation = []`
- for each payout
  - if payout is an external address
    - do an external transfer to the address
  - else
    - `balances[destination] += payout.amount`

* when can we delete the guarantee? only when the allocation has been deleted. but this means we can only delete one guarantee. So maybe just don't bother
