---
id: understand-channel-storage
title: Understand channel storage
---

The adjudicator contract stores certain information about any channel that it knows about. Specifically, it stores

- `uint48 turnNumRecord`
- `uint48 finalizesAt`
- `uint160 fingerprint`

serialized, inside the following mapping (with `channelId` as the key):

```solidity
    mapping(bytes32 => bytes32) public channelStorageHashes;
```

The value of `channelStorageHashes[someChannelId]` is obtained by:

- setting the most significant 48 bits to the `turnNumRecord`
- setting the next most significant 48 bits to `finalizesAt`
- setting the next most significant 160 bits to the `fingerprint`

The `fingerprint` uniquely identifies the channel's current state, up to hash collisions. It is the 160 least significant bits of `keccak256(abi.encode(channelData))`, where `channelData` is a struct of type

```solidity
    struct ChannelData {
        uint256 turnNumRecord;
        uint256 finalizesAt;
        bytes32 stateHash; // keccak256(abi.encode(State))
        address challengerAddress;
        bytes32 outcomeHash // keccak256(abi.encode(Outcome));
    }
```

When the adjudicator needs to verify the exact state or outcome, the data is provided in the function arguments, as part of the `calldata`. The chain will then check that the hydrated data hashes to the image that has been stored.

We provide a helper function to construct the appropriate hash from a javascript representation of `ChannelData`:

```typescript
import {ChannelData, channelDataToChannelStorageHash} from '@statechannels/nitro-protocol';

const channelData: ChannelData = {
  turnNumRecord: largestTurnNum,
  finalizesAt: 0x0,
};
const channelStorageHash = channelDataToChannelStorageHash(channelData);
```

We'll be using this in the next tutorial lesson.

### `turnNumRecord`

`turNumRecord` is the highest turn number that is known to the chain to be supported by a full set of signatures.
The exception to this rule is that it is set to `0` when the channel is concluded via a `conclude` call.

For example, the `turnNumRecord` might be increased by a submitted transaction including

- a `validTransition` m-chain (i.e. an ordered list of `m <= n` states such that each state in the list is a valid transition from its predecessor), and
- `n` signatures such that each participant has signed the state in the m-chain for which they are a mover (or a later one)

One example of this is a transaction including a single state signed by all `n` participants.

Note that a new `validTransition` `m`-chain may be implied by a single, signed state that is a validTransition from a state already supported on-chain: and hence the `turnNumRecord` can be incremented by a `respond` transaction.

### Channel Modes

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
Challenge-->|respond| Open
Challenge-->|checkpoint| Open
Challenge-->|conclude| Finalized
Challenge-->|timeout| Finalized
</div>
