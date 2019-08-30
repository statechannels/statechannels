---
id: transfer
title: Transfer
---

### TransferAll

`transferAll(bytes32 channelAddress, AllocationItem[] allocation)`

Algorithm:

- checks that `outcomes[channelAddress]` is equal to `hash(0, allocation)`, where `0` signifies an outcome type of `ALLOCATION`
- `let balance = balances[channelAddress]`
- let payouts = []
- let newAllocation = []
- let j = 0
- for 0 <= i < allocation.length
  - let (destination, amount) = allocation[i]
  - if balance == 0
    - newAllocation[j] = (destination, amount)
    - j++
  - else if balance <= amount
    - payouts[i] = (destination, balance)
    - newAllocation[j] = (destination, amount - balance)
    - balance = 0
  - else
    - payouts[i] = (destination, amount)
    - balance -= amount
- sets `balances[channelAddress] = balance`
  - note: must do this before calling any external contracts to prevent re-entrancy bugs
- sets `outcomes[channelAddress] = hash(newAllocation)` or clears if `newAllocation = []`
- for each payout
  - if payout is an external address
    - do an external transfer to the address
  - else
    - `balances[destination] += payout.amount`
