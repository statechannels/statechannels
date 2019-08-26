---
id: nitro-implementation-notes
title: Implementation Notes
---

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
