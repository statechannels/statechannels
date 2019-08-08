---
id: channel-storage
title: Channel Storage
---

### `turnNumRecord`

`turNumRecord` is the highest turn number that has been established on chain. Established here means being the turnNum of a state submitted to the chain in a transaction and either

- featuring in a valid n-chain (i.e. an ordered list of n states each signed by their respective participants, and such that each state in the list is a valid transition from its predecessor), or

- being the turn number of a single state signed by all `n` participants.

Note that a new valid n-chain may be implied by a single, signed state that is a validTransition from the final state of a previously established n-chain: and hence the `turnNumRecord` can be incremented by a `respond` transaction.

## On-chain state

- `turnNumRecord`
- `storedState`
- `finalizesAt`
- `challengerAddress`

### Channel Modes

- **Open** if `finalizesAt` is null
  - implies that `stateHash` and `challengerAddress` are also null
  - `turnNumRecord` could be null but might not be
- **Challenge** if `finalizesAt < currentTime`
  - implies that all other fields are not null
- **Finalized** if `finalizesAt >= currentTime`
  - implies that all other fields are not null
