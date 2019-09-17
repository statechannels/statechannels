---
id: conclude
title: conclude
---

The conclude methods allow anyone with sufficient on-chain state to immediately finalize an outcome for a channel wihout having to wait for a challenge to expire.

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, an expired challenge is stored against the `channelId`.

There is a seperate method to call, depending on whether a challenge is ongoing or whether the channel is open.

## Specification

Signature

```solidity
    function conclude(States states, Signatures sigs)
```

Notes:

Determine the channel from the `concludeState` (the first state in the array).

Requirements:

- Channel is in the Open mode or the Challenge mode
- First state isFinal
- States form a chain of valid transitions
- Signatures are valid for states

Effects:

- Sets finalizesAt to current time
- Sets challengeHash to the hash of the concludeState
- [Optionally] Clears turnNumRecord
- [Optionally] Clears challengerAddress

---

## Implementation

### ConcludeFromOpen

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

* Let m = sigs.length
* For i = 0 up to (m-1):
  - let turnNum = largestTurnNum - i
  - let isFinal=true
  - calculate the stateHash
  - _by construction, these states are all validTransitions_
* Check \_validSignatures(stateHashes, sigs)
* Set channelStorage
  - finalizesAt = time.now
  - turnNumRecord - doesn't matter (unchanged / 0 / removed)
  - challengerAddess - empty
  - outcomeHash - need to pass this in and check it matches state sig
  - stateHash - empty

## ConcludeFromChallenge

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
    bytes32 challengeOutcomeHash,
    bytes memory channelStorageLiteBytes // This is to avoid a 'stack too deep' error by minimising the number of local variables
)
```

- Calculate `channelId` from fixedPart
- Decode `channelStorageLiteBytes`
- Check that `turnNumRecord > 0`
- Check that `finalizesAt > now`

- Calculate `storageHash` from `turnNumRecord`, `finalizesAt`, `challengerAddress`, `challengeStateHash`, `challengeOutcomeHash`
- Check that `channelStorageHashes[channelId] == storageHash`
- call internal `_conclude` function

## \_conclude

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

- Let `m = variableParts.length`
- For `i` in `0 .. (m-1)`:

  - let `turnNum = largestTurnNum + i - numStates`
  - let `isFinal = true`
  - Calculate `stateHash[i]` from `channelId, turnNum, isFinal, appPartHash, outcomeHash`
  - _by construction, these states are all validTransitions_

- Check that `_validSignatures(largestTurnNum, participants, stateHashes, sigs, whoSignedwhat)`
- Set channelStorage
  - `finalizesAt = now`
  - `turnNumRecord = 0`
  - `challengerAddess = address(0)`
  - `outcomeHash = outcomeHash`
  - `stateHash = bytes32(0)`
- Emit a Concluded Event
