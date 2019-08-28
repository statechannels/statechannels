---
id: refute
title: Refute
---

Tje `refute` method allows anyone with a single sufficient off-chain state to clear a challenge stored against a `channelId`. The state in question must have a higher `turnNum` than the challenge state stored on chain, and must be signed by the `challengerAddress` also stored on chain.

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, the existing challenge is cleared and the `turnNumRecord` preserved.

### Specification

Call

`refute(uint256 turnNumRecord, State challengeState, State refutationState, Signature sig)`

Notes:

Determine the channel from the `refutationState`.

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
    uint256 turnNumRecord,
    uint256 refutationStateTurnNum,
    uint256 finalizesAt,
    address challenger,
    bool[2] memory isFinalAB,
    FixedPart memory fixedPart,
    ForceMoveApp.VariablePart[2] memory variablePartAB,
    // variablePartAB[0] = challengeVariablePart
    // variablePartAB[1] = refutationVariablePart
    Signature memory refutationStateSig
)
```

- Check `refutationStateTurnNum` > `turnNumRecord`
- Calculate `channelId` from fixedPart
- Calculate `challengeStateHash` from `turnNumRecord, isFinalAB[1], channelId, fixedPart, variablePart[0]`
- Calculate `challengeStorageHash` from `turnNumRecord, finalizesAt, challengeStateHash, challengerAddress`
- Check that `finalizesAt > now`
- Check that `channelStorageHashes[channelId] == challengeStorageHash`
- Calculate `refutationStateHash` from `refutationStateTurnNum, isFinalAB[1, channelId, fixedPart, variablePart[1]`
- Check that `refutationTurnNum > turnNumRecord`
- Check that `recoverSigner(refutationStateHash, refutationSig) == challengerAddress`- Set channelStorage:
  - `turnNumRecord = turnNumRecord`
  - Other fields set to their null values (see [Channel Storage](./channel-storage)).- Set `stateStorageHashes[channelId] = hash(turnNumRecord, 0, 0, 0)`
