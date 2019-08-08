---
id: refute
title: Refute
---

## Spec

Call

`refute(State refutationState, Signature sig)`

Notes:

Determine the channel from the `refutationState` (the final state in the array).

Requirements:

- Channel is in the Challenge mode
- The refutationState's turnNum is greater than the turnNumRecord
- Sig is the challenger's signature on the refutationState

Effects:

- Clears challenge (by clearing finalizesAt, stateHash and challengerAddress)

---

## Implementation

```
function refute(
    FixedPart memory fixedPart, // dont need appDefinition
    bytes32 appPartHash,
    bytes32 outcomeHash,
    uint256 turnNumRecord,
    uint256 refutationTurnNum,
    bool refutationIsFinal,
    uint256 finalizesAt,
    address challengerAddress,
    bytes32 challengeStateHash,
    bytes32 challengeOutcomeHash,
    Signature refutationSig,
)
```

- Calculate `channelId` from fixedPart
- Calculate `stateStorageHash` as `hash(turnNumRecord, finalizesAt, challengeStateHash, challengeOutcomeHash, challengerAddress)`
- Check that `stateStorageHashes[channelId] == stateStorageHash`
- Calculate `refutationStateHash` as `hash(refutationTurnNum, refutationIsFinal, channelId, appPartHash)`
- Check that `refutationTurnNum > turnNumRecord`
- Check that `recoverSigner(refutationStateHash, refutationSig) == challengerAddress`
- Set `stateStorageHashes[channelId] = hash(turnNumRecord, 0, 0, 0)`
