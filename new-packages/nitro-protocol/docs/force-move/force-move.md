---
id: force-move
title: ForceMove
---

### ForceMove

Call:

`forceMove(State[] states, Signatures[] signatures, challengerSig)`

Notes:

Determine the channel from the `challengeState` (the final state in the array).

Requirements:

- States form a chain of valid transitions
- Channel is in the Open mode
- Signatures are valid for the states
- ChallengerSig is valid
- ChallengeTurnNum is greater than turnNumRecord

Effects:

- Sets turnNumRecord to the challengeTurnNum
- Sets finalizesAt to currentTime + challengeInterval
- Sets stateHash
- Sets challengerAddress

---

## Implmentation

- Parameters
  - uint256 turnNumRecord,
  - FixedPart memory fixedPart,
  - uint256 largestTurnNum,
  - VariablePart[] memory variableParts, // latest state first
  - uint8 isFinalCount, // how many of the states are final
  - Signature[][] memory sigs,
  - Signature memory challengerSig,
  - uint8 challengerIndex,

* Calculate `channelId` from fixed part
* If `turnNumRecord == 0`
  - Check that `channelStorageHashes[channelId] = 0`
* Else
  - Calculate `emptyStorageHash = hash(turnNumRecord, 0, 0, 0)`
  - Check that `channelStorageHashes[channelId] = emptyStorageHash`
  - Check that the `largestTurnNum >= turnNumRecord`
* Let `m = variableParts.length`
* [Optional] assert `sigs.length == m` // signature algorithm should just break if this isn't the case
* For `i` in `0 .. (m-1)`:
  - Let `isFinal = i < isFinalCount`
  - Let `turnNum = largestTurnNum - i`
  - Calculate state hash from fixedPart, turnNum, variablePart[i], isFinal
  - If i == 0
    - Save outcomeHash for later
  - Else // i > 0
    - Ensure app.validTransition(turnNum, variablePart[i], variablePart[i-1])
    - (Other checks are covered by construction)
* Check that validSignatures(participants, moverIndex, stateHashes, sigs)
* Recover challengerAddress from sig and check that `participants[challengerIndex] == challengerAddress`
* Set channelStorage
  - `finalizesAt` = now + challengeDuration
  - outcomeHash, stateHash
  - turnNumRecord = largestTurnNum
  - challengerAddress
