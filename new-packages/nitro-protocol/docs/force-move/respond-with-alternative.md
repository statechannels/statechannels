---
id: respond-with-alternative
title: Respond With Alternative
---

The respondWithAlternative method allows anyone with sufficient off-chain state to establish a new and higher `turnNumRecord` to clear an existing challenge stored against a `channelId`. 'Alternative' here means the new `turnNumRecord` may be supported by an alternative history of states (and need not agree with any challenge state stored on chain).

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, the existing challenge is cleared and the `turnNumRecord` is incremented by one.

### Specification

Call:

`respondWithAlternative(uint256 turnNumRecord, State[] states, Signatures[] signatures)`

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

```solidity
   struct ChannelStorageLite {
        uint256 finalizesAt;
        bytes32 stateHash;
        address challengerAddress;
        bytes32 outcomeHash;
    }

    function respondWithAlternative(
        FixedPart memory fixedPart,
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
        bytes memory channelStorageLiteBytes // This is to avoid a 'stack too deep' error by minimising the number of local variables
    )
```

- Decode `channelStorageLiteBytes`
- Calculate `channelId` from fixedPart
- Check that `finalizesAt > now`
- Calculate `storageHash` from `turnNumRecord`, `finalizesAt`, `challengerAddress`, `challengeStateHash`, `challengeOutcomeHash`
- Check that `channelStorageHashes[channelId] == storageHash`
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
- Set channelStorage:
  - `turnNumRecord = largestTurnNum`
  - Other fields set to their null values (see [Channel Storage](./channel-storage)).
