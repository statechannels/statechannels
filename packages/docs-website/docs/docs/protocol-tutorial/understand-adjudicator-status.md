---
id: understand-adjudicator-status
title: Understand adjudicator status
---

import Mermaid from '@theme/Mermaid';

The adjudicator contract stores certain information about any channel that it knows about. Specifically, it stores data derived from the `ChannelData` struct, which contains:

- `uint48 turnNumRecord`
- `uint48 finalizesAt`
- `uint160 thumbprint`
- `bytes32 stateHash // keccak256(abi.encode(State))`
- `address challengerAddress`
- `bytes32 outcomeHash`

The derived data is stored inside the following mapping (with `channelId` as the key):

```solidity
    mapping(bytes32 => bytes32) public statusOf;
```

Generating a 32 byte `status` involves

- setting the most significant 48 bits to the `turnNumRecord`
- setting the next most significant 48 bits to `finalizesAt`
- setting the next most significant 160 bits to the `fingerprint`

The `fingerprint` helps to uniquely identify the channel's current state, up to hash collisions. It is computed as:

```solidity
uint160(
        uint256(
            keccak256(
                abi.encode(
                    channelData.stateHash,
                    channelData.challengerAddress,
                    channelData.outcomeHash
                )
            )
        )
    )
```

When the adjudicator needs to verify the exact state or outcome, the data is provided in the function arguments, as part of the `calldata`. The chain will then check that the hydrated data matches the status that has been stored.

:::note
`turnNumRecord` and `finalizesAt` can be read from storage straightforwardly, whereas the other `ChannelData` fields are only stored as the output of a one-way function. The input to this function must therefore be tracked in client code by monitoring the relevant contract events.
:::

We provide a helper function to construct the appropriate status from a javascript representation of `ChannelData`:

```typescript
import {ChannelData, channelDataToFingerprint} from '@statechannels/nitro-protocol';

const channelData: ChannelData = {
  turnNumRecord: largestTurnNum,
  finalizesAt: 0x0
};
const status = channelDataToStatus(channelData);
```

Here we omitted some of the fields, because the helper function is smart enough to know to set them to null values when finalizes at is zero. We'll be using this helper in the next tutorial lesson.

### `turnNumRecord`

`turNumRecord` is the highest turn number that is known to the chain to be supported by a full set of signatures.
The exception to this rule is that it is set to `0` when the channel is concluded via a `conclude` call.

For example, the `turnNumRecord` might be increased by a submitted transaction including

- a `validTransition` m-chain (i.e. an ordered list of `m <= n` states such that each state in the list is a valid transition from its predecessor), and
- `n` signatures such that each participant has signed the state in the m-chain for which they are a mover (or a later one)

One example of this is a transaction including a single state signed by all `n` participants.

Note that a new `validTransition` `m`-chain may be implied by a single, signed state that is a validTransition from a state already supported on-chain: and hence the `turnNumRecord` can be incremented by a `respond` transaction.

### Channel Modes

The `finalizesAt` part of the status, together with block timestamp, imply a channel is in one or the other of three modes:

```solidity
function _mode(bytes32 channelId) internal view returns (ChannelMode) {
  // Note that _getFingerprint(someRandomChannelId) returns (0,0,0), which is
  // correct when nobody has written to storage yet.

  (, uint48 finalizesAt, ) = _getFingerprint(channelId);
  if (finalizesAt == 0) {
    return ChannelMode.Open;
  } else if (finalizesAt <= now) {
    return ChannelMode.Finalized;
  } else {
    return ChannelMode.Challenge;
  }
}

```

These states can be represented in the following state machine:
<Mermaid chart='
graph LR
linkStyle default interpolate basis
Open -->|challenge| Challenge
Open -->|checkpoint| Open
Open-->|conclude| Finalized
Challenge-->|challenge| Challenge
Challenge-->|respond| Open
Challenge-->|checkpoint| Open
Challenge-->|conclude| Finalized
Challenge-->|timeout| Finalized' />
