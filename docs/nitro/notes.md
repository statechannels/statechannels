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
