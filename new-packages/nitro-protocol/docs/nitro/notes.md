---
id: nitro-implementation-notes
title: Implementation Notes
---

## Outcomes

```
(address assetHolder, bytes assetOutcome)[]
```

AssetOutcome has one of two types:

```
(uint8 type, bytes allocationOrGuarantee)
```

```
// allocation
(bytes32 destination, uint256 amount)[]

// guarantee
(address guaranteedChannel, bytes32[] destinations)
```

### Aside: Single Asset Payment Game

How would a payment game work with this setup? Idea: we can restrict it to single asset.

- Throws if more than one asset
- Throws unless the assetoutcome is an allocation
- Throws unless that allocation has exactly n outcomes
- Interprets the nth outcome as belonging to participant n
- Checks that the sum of assets hasn't changed
- And that for all non-movers
  - the balance hasn't decreased
  - the destination hasn't changed
- For the mover:
  - [optional] the destination hasn't changed
  - [redundant] the balance hasn't increased (covered by the sum + other balances not decreasing)

## Asset Holder Methods:

- deposit
- withdraw
- setOutcome [private to adjudicator]
- transferAll(channelAddress, allocation)
- claimAll(channelAddress, guarantee, allocation)
  - checks everything matches what's stored
  - pays out until balance has gone
  - stores updated versions to the contract
- [optimization] execute(instructionsData)
  - like a multi-transaction
  - MUST be scoped to only withdraw, transferAll, claimAll operations for safety

Would be neat if we can get money right out.

- Option 1: encode eth addresses in some way and have transfer just do this
  - What if we used the first 12 bytes being zero? This has a 1 in 2^(96) ~= 10^30 = impossible chance of happening
- Option 2: require specific withdrawals with signatures

Especially for a partialWithdrawal
Or a complete withdrawal of the ledger channel

Instructions:

- transferAll
- claimAll
- withdraw

- push(channelId, outcome)
- pushAndExecute(channelId, outcome, instructionsData[m])
  - iterates along pushing and then calling execute with instructionsData

## Destinations

Destinations are either addresses or channel ids
Destinations are stored as bytes32.
If the left-most 12 bytes are all 0, then the destination is an external address.
Otherwise, the address corresponds to a channel (and is equal to the channelId)

## Methods

### TransferAll

`transferAll(bytes32 channelAddress, AllocationItem[] allocation)`

Algorithm:

- checks that `outcomes[channelAddress]` is equal to `hash(ALLOCATION, allocation)`
- `let balance = balances[channelAddress]`
- let payouts = []
- let newAllocation = []
- let j = 0
- for 0 <= i < allocation.length
  - let (destination, amount) = allocation[i]
  - if balance == 0
    - newAllocation[j] = (destination, amount)
    - j++
  - elsif balance <= amount
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

### ClaimAll

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

### setOutcome

`setOutcome(bytes32 channelId, bytes outcome)`

Requirements

- Caller must be the adjudicator
- `outcomes[channelId]` must be empty

Effects

- Sets `outcomes[channelId] = hash(outcome)`
