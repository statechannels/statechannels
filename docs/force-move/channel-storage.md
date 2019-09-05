---
id: channel-storage
title: Channel Storage
---

## On-chain state

The contract will store the hash of the following struct:

```solidity
    struct ChannelStorage {
        uint256 turnNumRecord;
        uint256 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        address challengerAddress;
        bytes32 outcomeHash;
    }
```

(abi encoded) in a mapping with `channelId` as the key:

```solidity
    mapping(bytes32 => bytes32) public channelStorageHashes;
```

### `turnNumRecord`

`turNumRecord` is the highest turn number that is known to the chain to be supported by a full set of signatures. For example, the `turnNumRecord` might be increased by a submitted transaction including

- a validTransitionChain (i.e. an ordered list of m<=n states such that each state in the list is a valid transition from its predecessor), and
- n signatures such that each participant has signed the state in the m-chain for which they are a mover (or a later one)

One example of this is a transaction including a single state signed by all `n` participants.

Note that a new validTransitionChain may be implied by a single, signed state that is a validTransition from the final state of a previously established n-chain: and hence the `turnNumRecord` can be incremented by a `respond` transaction.

### Channel Modes

- **Open** if `finalizesAt` is null
  - implies that `stateHash` and `challengerAddress` are also null
  - `turnNumRecord` could be null but might not be
- **Challenge** if `finalizesAt < currentTime`
  - implies that all other fields are not null
- **Finalized** if `finalizesAt >= currentTime`

  - implies that all other fields are not null

These states can be represented in the following state machine:

<div class="mermaid">
graph LR
linkStyle default interpolate basis
NoInfo-->|forceMove| Challenge
NoInfo-->|concludeFromOpen| Finalized
Open-->|concludeFromOpen| Finalized
Challenge-->|concludeFromChallenge| Finalized
Challenge-->|refute| Open
Challenge-->|respond| Open
Challenge-->|timeout| Finalized
</div>

The implementatino of the null fields is as follows. For a cleared challenge:

```solidity
channelStorageHashes[channelId] = ChannelStorage(turnNumRecord, 0, bytes32(0), address(0), bytes32(0));
```

and for no challenges yet:

```solidity
channelStorageHashes[channelId] = bytes32(0);
```

---

## Implementation

Storage costs on-chain are high and tend to dwarf other gas fees. The implementation therefore minimizes on-chain storage as much as possible.

ForceMove requires certain data to be available on-chain.

**The key idea here is to store a hash of this data, instead of storing the data itself.** The actual data can then be provided as required to each method, as part of the calldata. The chain will then check that the hydrated data hashes to the image that has been stored.

### FAQs

**Why include the `outcomeHash`?** Although the `outcome` is included in the `state`, we include the `outcomeHash` at the top level of the `channelStorageHash` to make it easier for the PushOutcome method to prove what the outcome of the channel was. The tradeoff here is that the methods need to make sure they have the data to calculate it - which adds at most a `bytes32` to their calldata.
