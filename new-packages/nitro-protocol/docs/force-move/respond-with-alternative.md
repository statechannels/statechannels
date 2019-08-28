---
id: respond-with-alternative
title: Respond With Alternative
---

## Spec

Call:

`respondFromAlternative(State[] states, Signatures[] signatures)`

Notes:

Determine the channel from the `responseState` (the final state in the array).

Requirements:

- States form a chain of valid transitions
- Channel is in the Challenge mode
- Signatures are valid for the states
- The responseState turnNum > turnNumRecord

Effects:

- Clears challenge (by clearing finalizesAt, stateHash and challengerAddress)
- Sets turnNumRecord to the turnNum of the responseState

---

## Implementation

Parameters:

```
function respondFromAlternative(
    uint256 turnNumRecord, // can deduce largestTurnNum from this
    FixedPart memory fixedPart,
    uint8 isFinalCount, // how many of the states are final
    VariablePart[] memory variableParts,
    Signature[][] memory sigs,
    uint256 finalizesAt,
    address challengerAddress,
    bytes32 challengeStateHash,
    bytes32 challengeOutcomeHash,
)
```

- Calculate `channelId` from fixedPart
- Calculate `storageHash` from `turnNumRecord`, `finalizesAt`, `challengerAddress`, `challengeStateHash`, `challengeOutcomeHash`
- Check that `channelStorageHashes[channelId] == storageHash`
- Let `m = variableParts.length`
- Let `largestTurnNum = turnNumRecord + 1`
- For `i` in `0 .. (m-1)`:
  - Let `isFinal = i < isFinalCount`
  - Let `turnNum = largestTurnNum - i`
  - Calculate state hash from fixedPart, turnNum, variablePart[i], isFinal
  - If i > 0
    - Ensure app.validTransition(turnNum, variablePart[i], variablePart[i-1])
    - (Other checks are covered by construction)
- Check that validSignatures(stateHashes, sigs)
- Set channelStorage:
  - turnNumRecord += 1
  - Everything else 0
