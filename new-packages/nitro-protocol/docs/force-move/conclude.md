---
id: conclude
title: Conclude
---

## Spec

Call

`conclude(States states, Signatures sigs)`

Notes:

Determine the channel from the `concludeState` (the first state in the array).

Requirements:

- Channel is in the Open mode or the Challenge mode
- First state is a conclude state
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

```
function concludeFromOpen(
    uint256 turnNumRecord,
    uint256 largestTurnNum,
    FixedPart memory fixedPart, // don't need appDefinition
    bytes32 appPartHash,
    bytes32 outcomeHash,
    Signature[][] memory sigs,
)
```

- Calculate `channelId` from fixedPart
- If `turnNumRecord == 0`
  - Check that `stateStorageHashes[channelId] == 0`
- Else
  - Calculate `stateStorageHash` as `hash(turnNumRecord, 0, 0, 0, 0)`
  - Check that `stateStorageHashes[channelId] == stateStorageHash`
- Let m = sigs.length
- For i = 0 up to (m-1):
  - let turnNum = largestTurnNum - i
  - let isFinal=true
  - calculate the stateHash
  - _by construction, these states are all validTransitions_
- Check \_validSignatures(stateHashes, sigs)
- Set channelStorage
  - finalizesAt = time.now
  - turnNumRecord - doesn't matter (unchanged / 0 / removed)
  - challengerAddess - empty
  - outcomeHash - need to pass this in and check it matches state sig
  - stateHash - empty

## ConcludeFromChallenge

```
function concludeFromChallenge(
    uint256 turnNumRecord,
    address challengerAddress,
    uint256 finalizesAt,
    bytes32 challengeStateHash,
    bytes32 challengeOutcomeHash,
    uint256 largestTurnNum,
    FixedPart memory fixedPart, // don't need appDefinition
    bytes32 appPartHash,
    bytes32 outcomeHash,
    // need the outcomeHash (and to verify that the outcomeHash is in the state)
    Signature[][] memory sigs,
)
```

- Calculate `channelId` from fixedPart
- If `turnNumRecord == 0`
  - Check that `stateStorageHashes[channelId] == 0`
- Else
  - calculate `stateStorageHash` as `hash(turnNumRecord, finalizesAt, challengeStateHash, challengeOutcomeHash, challengerAddress)`
  - Check that `stateStorageHashes[channelId] == stateStorageHash`
- Let m = sigs.length
- For i = 0 up to (m-1):
  - let turnNum = largestTurnNum - i
  - let isFinal=true
  - calculate the stateHash
  - _by construction, these states are all validTransitions_
- Check \_validSignatures(stateHashes, sigs)
- Set channelStorage
  - finalizesAt = time.now
  - turnNumRecord - doesn't matter (unchanged / 0 / removed)
  - challengerAddess - empty
  - outcomeHash - need to pass this in and check it matches state sig
  - stateHash - empty
