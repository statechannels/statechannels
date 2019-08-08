---
id: respond
title: Respond
---

## Spec

Call:

`respond(State challengeState, State nextState, Signature nextStateSig)`

Notes:

Determine the channel from the `nextState`.

Requirements:

- challengeState matches stateHash
- challengeState to nextState is a valid transition
- channel is in Challenge mode

Effects:

- Clears challenge (by clearing finalizesAt, stateHash and challengerAddress)
- Increases the turnNumRecord by 1

## Implementation

```solidity
respond(
  uint256 turnNumRecord, // can deduce largestTurnNum from this
  FixedPart memory fixedPart,
  bool challengeStateIsFinal,
  bool responseStateIsFinal,
  VariablePart memory challengeVariablePart,
  VariablePart memory responseVariablePart,
  uint256 finalizesAt,
  address challengerAddress,
  Signature responderSig,
)
```

- Calculate `channelId` from fixedPart
- Calculate `challengeStateHash` and `challengeStateOutcome` from fixedPart, challengeVariablePart, turnNumRecord, challengStateIsFinal
- Calculate `storageHash = hash(turnNumRecord, finalizesAt, challengeStateHash, challengeStateOutcome)`
- Check that `channelStorageHashes[channelId] == storageHash`
- Calculate `responseStateHash`
- Check that recoverSig(resonseStateHash, challengerAddress) gives the mover
- Check app.validTransition(turnNumRecord + 1, challengeVariablePart, responseVariablePart)
- Set channelStorage:
  - turnNumRecord += 1
  - Everything else 0
