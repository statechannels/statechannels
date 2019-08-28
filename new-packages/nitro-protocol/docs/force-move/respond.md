---
id: respond
title: Respond
---

The respond method allows anyone with the appropriate, single off-chain state (usually the current mover) to clear an existing challenge stored against a `channelId`.

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, the existing challenge is cleared and the `turnNumRecord` is incremented by one.

### Specification

Call:

`respond(uint256 turnNumRecord, State challengeState, State responseState, Signature responseStateSig)`

Notes:

Determine the channel from the `responseState`.

Requirements:

- challengeState matches stateHash
- challengeState to responseState is a valid transition
- channel is in Challenge mode

Effects:

- Clears challenge (by clearing finalizesAt, stateHash and challengerAddress)
- Increases the turnNumRecord by 1

## Implementation

```solidity
respond(
    uint256 turnNumRecord,
    uint256 finalizesAt,
    address challenger,
    bool[2] memory isFinalAB,
    // isFinal[0] = challengeStateIsFinal
    // isFinal[1] = responseStateIsFinal
    FixedPart memory fixedPart,
    ForceMoveApp.VariablePart[2] memory variablePartAB,
    // variablePartAB[0] = challengeVariablePart
    // variablePartAB[1] = responseVariablePart
    Signature memory sig
)
```

- Calculate `channelId` from fixedPart
- Calculate `challengeStateHash` and `challengeStateOutcome` from `fixedPart, challengeVariablePart, turnNumRecord, challengStateIsFinal`
- Calculate `storageHash = hash(turnNumRecord, finalizesAt, challengeStateHash, challengeStateOutcome)`
- Check that `finalizesAt > now`
- Check that `channelStorageHashes[channelId] == storageHash`
- Calculate `responseStateHash`
- Recover the signer from the `responseStateHash` and check that they are the mover for `turnNumRecord + 1`
- Check `validTransition(nParticipants, isFinalAB, variablePartAB, appDefiintion)`
- Set channelStorage:
  - `turnNumRecord += 1`
  - Other fields set to their null values (see [Channel Storage](./channel-storage)).
