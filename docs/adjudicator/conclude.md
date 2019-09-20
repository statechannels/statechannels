---
id: conclude
title: conclude
---

If a participant signs a state with `isFinal = true`, then in a cooperative channel-closing procedure the other players can countersign that state and broadcast it. Once a full set of `n` such signatures exists \(this set is known as a **finalization proof**\) anyone in possession may use it to finalize the channel on-chain. They would do this by calling `conclude` on the adjudicator.

:::tip
In Nitro, the existence of this possibility can be relied on \(counterfactually\) to [close a channel off-chain](../auxiliary-protocols#closing-off-chain).
:::

The conclude methods allow anyone with sufficient off-chain state to immediately finalize an outcome for a channel without having to wait for a challenge to expire.

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, an expired challenge is stored against the `channelId`.

There is a separate method to call, depending on whether a challenge is ongoing or whether the channel is open.

## Specification

Signature

```solidity
    function conclude(States states, Signatures sigs)
```

Checks:

- Channel is either in the Open mode or the Challenge mode
- A finalization proof has been provided

Effects:

- Sets `finalizesAt` to current time
- Sets `outcomeHash` to be consistent with finalization proof
- Clears `stateHash`
- Clears `turnNumRecord`
- Clears `challengerAddress`

---

## Implementation

### concludeFromOpen

```solidity
function concludeFromOpen(
    uint256 turnNumRecord,
    uint256 largestTurnNum,
    FixedPart memory fixedPart, // don't need appDefinition
    bytes32 appPartHash,
    bytes32 outcomeHash,
    uint8 numStates,
    uint8[] memory whoSignedWhat,
    Signature[] memory sigs
)
```

- Calculate `channelId` from fixedPart
- If `channelStorageHashes[channelId] != 0`
  - Calculate `emptyStorageHash = hash(turnNumRecord, 0, 0, 0)`
  - Check that `channelStorageHashes[channelId] = emptyStorageHash`
- call internal `_conclude` function

### concludeFromChallenge

```solidity
struct ChannelStorageLite {
    uint256 finalizesAt;
    bytes32 stateHash;
    address challengerAddress;
    bytes32 outcomeHash;
}

function concludeFromChallenge(
    uint256 turnNumRecord,
    uint256 largestTurnNum,
    FixedPart memory fixedPart, // don't need appDefinition
    bytes32 appPartHash,
    uint8 numStates,
    uint8[] memory whoSignedWhat,
    Signature[] memory sigs,
    bytes32 newOutcomeHash,
    bytes memory channelStorageLiteBytes // This is to avoid a 'stack too deep' error by minimizing the number of local variables
)
```

- Calculate `channelId` from fixedPart
- Decode `channelStorageLiteBytes`
- Check that `finalizesAt > now`

- Calculate `storageHash` from `turnNumRecord`, `ChannelStorageLite.finalizesAt`, `challengerAddress`, `ChannelStorageLite.stateHash`, `ChannelStorageLite.outcomeHash`
- Check that `channelStorageHashes[channelId] == storageHash`
- call internal `_conclude` function with `newOutcomeHash`

### \_conclude

```solidity
    function _conclude(
        uint256 largestTurnNum,
        uint8 numStates,
        address[] memory participants,
        bytes32 channelId,
        bytes32 appPartHash,
        bytes32 outcomeHash,
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat
    )
```

- For `i` in `0 .. (numStates - 1)`:

  - let `turnNum = largestTurnNum + i - numStates`
  - let `isFinal = true`
  - Calculate `stateHash[i]` from `channelId, turnNum, isFinal, appPartHash, outcomeHash`
  - _by construction, these states are all validTransitions_

- Check that `_validSignatures(largestTurnNum, participants, stateHashes, sigs, whoSignedwhat)`
- Set channelStorage
  - `finalizesAt = now`
  - `turnNumRecord = 0`
  - `challengerAddress = address(0)`
  - `outcomeHash = outcomeHash`
  - `stateHash = bytes32(0)`
- Emit a Concluded Event
