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

---

## Implementation

Storage costs on-chain are high and tend to dwarf other gas fees. We therefore start by trying to minimize on-chain storage as much as possible.

As seen in the spec, ForceMove requires certain data to be available on-chain.
In a naive implementation we would expect something like the following to be stored for each channel:

```
struct ChannelStorage {
  uint256 turnNumRecord;
  uint256 finalizesAt;
  State storedState;
  address challengerAddress;
}

mapping(address => ChannelStorage) channelStorages;
```

**The key idea here is to store a hash of this data, instead of storing the data itself.** The actual data can then be provided as required to each method, as part of the calldata.

Instead of the naive storage implementation above, we can store the hash of the state in the struct, and store the hash of that struct in the mapping:

```
struct ChannelStorage {
  uint256 turnNumRecord;
  uint256 finalizesAt;
  bytes32 stateHash;
  address challengerAddress;
}

mapping(address => bytes32) channelStorageHashes;
```

### Proposal for `ChannelStorageHash`

The `ChannelStorageHash` is the hash of:

- `turnNumRecord`
- `finalizesAt`
- `stateHash`
- `challengerAddress`
- `outcomeHash`

**Why include the `outcomeHash`?** Although the `outcome` is included in the `state`, we include the `outcomeHash` at the top level of the `channelStorageHash` to make it easier for the PushOutcome method to prove what the outcome of the channel was. The tradeoff here is that the methods need to make sure they have the data to calculate it - which adds at most a `bytes32` to their calldata.
