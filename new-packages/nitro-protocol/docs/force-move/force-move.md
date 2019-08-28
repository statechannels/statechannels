---
id: force-move
title: ForceMove
---

The forceMove function allows anyone holding the appropriate off-chain state to register a challege on chain. It is designed to ensure that a state channel can progress or be finalized in the event of inactivity on behalf of a participant (e.g. the current mover).

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, an `outcome` is registered against the `channelId`, with a finalization time set at some delay after the transaction is processed. This delay allows the challenge to be cleared by a timely and well-formed [respond](./respond), [respondWithAlternative](./respond-with-alternative) or [refute](./refute) transaction. If no such transaction is forthcoming, the challenge will time out, allowing the `outcome` registered to be finalized. A finalized outcome can then be used to extract funds from the channel.

### Specification

Call:

`forceMove(uint256 turnNumRecord, State[] states, Signatures[] signatures, Signature challengerSig)`

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

## Implementation

```solidity
function forceMove(
        uint256 turnNumRecord,
        FixedPart memory fixedPart,
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
        Signature memory challengerSig
    ) public
```

- Calculate `channelId` from fixed part
- Check that the `largestTurnNum >= turnNumRecord`
- If `channelStorageHashes[channelId] != 0`
  - Calculate `emptyStorageHash = hash(turnNumRecord, 0, 0, 0)`
  - Check that `channelStorageHashes[channelId] = emptyStorageHash`
- Let `m = variableParts.length`
- For `i` in `0 .. (m-1)`:
  - Let `isFinal = i > m - isFinalCount`
  - Let `turnNum = largestTurnNum + i - m + 1`
  - Calculate `stateHash[i]` from `fixedPart, channelId, turnNum, variablePart[i], isFinal`
  - If `i + 1 != m`
    - Calculate `isFinalAB = [i > m - isFinalCount, i + 1 > m - isFinalCount]`
    - Calculate `turnNumB = largestTurnNum + i - m + 2`
    - Ensure `validTransition(nParticipants, isFinalAB, turnNumB, variablePart[i], variablePart[i+1], appDefinition)`
    - (Other checks are covered by construction)
- Check that `_validSignatures(largestTurnNum, participants, stateHashes, sigs, whoSignedwhat)`
- Calculate `msgHash` as `keccak256(abi.encode(largestTurnNum, channelId, 'forceMove'))`
- Recover challengerAddress from `msgHash` and `challengerSig` and check that `_isAddressInArray(challengerAddress, participants)`
- Set channelStorage as the hash of the abi encode of
  - `turnNumRecord = largestTurnNum`
  - `finalizesAt = now + challengeDuration`
  - `stateHashes[m-1]`
  - `challengerAddress`
  - `outcomeHash = hash(outcomes[m-1])`
- Emit a ForceMove event

:::note This is a test note
The challenger needs to sign this data:

```
keccak256(abi.encode(largestTurnNum, channelId, 'forceMove'))
```

in order to signal their intent to forceMove this channel to this largestTurnNum. This mechanism allows the forceMove to be authorized only by a channel participant: this means the challenge may be refuted, if a refuter can prove that the challenger has signed a later state.
:::
