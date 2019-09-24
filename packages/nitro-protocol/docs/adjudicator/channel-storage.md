---
id: channel-storage
title: ChannelStorage
---

The adjudicator contract stores

- `uint48 turnNumRecord`
- `uint48 finalizesAt`
- `uint160 fingerprint`

inside the following mapping, with `channelId` as the key:

```solidity
    mapping(bytes32 => bytes32) public channelStorageHashes;
```

The `fingerprint` uniquely identifies the channel's current state, up to hash collisions.

## Turn number record

`turNumRecord` is the highest turn number that is known to the chain to be supported by a full set of signatures.
The exception to this rule is that it is set to `0` when the channel is concluded via a `conclude` call.

For example, the `turnNumRecord` might be increased by a submitted transaction including

- a `validTransition` m-chain (i.e. an ordered list of `m <= n` states such that each state in the list is a valid transition from its predecessor), and
- `n` signatures such that each participant has signed the state in the m-chain for which they are a mover (or a later one)

One example of this is a transaction including a single state signed by all `n` participants.

Note that a new `validTransition` `m`-chain may be implied by a single, signed state that is a validTransition from a state already supported on-chain: and hence the `turnNumRecord` can be incremented by a `respond` transaction.

## Channel Modes

- **Open** if and only if `finalizesAt` is null
  - implies that `stateHash` and `challengerAddress` are also null
- **Challenge** if and only if `finalizesAt < currentTime`
  - implies that all other fields are not null
- **Finalized** if and only if `finalizesAt >= currentTime`
  - implies that all other fields are not null

These states can be represented in the following state machine:

<div class="mermaid">
graph LR
linkStyle default interpolate basis
Open -->|forceMove| Challenge
Open -->|checkpoint| Open
Open-->|conclude| Finalized
Challenge-->|forceMove| Challenge
Challenge-->|refute| Open
Challenge-->|respond| Open
Challenge-->|checkpoint| Open
Challenge-->|conclude| Finalized
Challenge-->|timeout| Finalized
</div>

---

## Implementation

Storage costs on-chain are high and tend to dwarf other gas fees. The implementation therefore minimizes on-chain storage as much as possible.

ForceMove requires certain data to be available on-chain.

The value of `channelStorageHashes[someChannelId]` is obtained by:

- setting the most significant 48 bits to the `turnNumRecord`
- setting the next most significant 48 bits to `finalizesAt`
- setting the next most significant 160 bits to the `fingerprint`

The `fingerprint` is the 160 least significant bits of `keccak256(abi.encode(channelStorage))`, where `channelStorage` is a struct of type

```solidity
    struct ChannelStorage {
        uint256 turnNumRecord;
        uint256 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        address challengerAddress;
        bytes32 outcomeHash // keccak256(abi.encode(Outcome));
    }
```

When the adjudicator needs to verify the exact state or outcome, the data is provided in the function arguments, as part of the `calldata`. The chain will then check that the hydrated data hashes to the image that has been stored.

## FAQs

### **Why include the `outcomeHash`?**

Although the `outcome` is included in the `state`, we include the `outcomeHash` at the top level of the `channelStorageHash` to make it easier for the [`pushOutcome`](./push-outcome) method to prove what the outcome of the channel was. The tradeoff here is that the methods need to make sure they have the data to calculate it - which adds at most a `bytes32` to their `calldata`.
