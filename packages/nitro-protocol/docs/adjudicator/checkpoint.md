---
id: checkpoint
title: checkpoint
---

The `checkpoint` method allows anyone with a supported off-chain state to establish a new and higher `turnNumRecord` and clear an existing challenge stored against a `channelId`.

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, the `turnNumRecord` is updated and the challenge, if exists is cleared.

## Specification

Signature:

```solidity
   struct ChannelStorageLite {
        uint256 finalizesAt;
        bytes32 stateHash;
        address challengerAddress;
        bytes32 outcomeHash;
    }

    function checkpoint(
        FixedPart memory fixedPart,
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
        bytes memory channelStorageLiteBytes // This is to avoid a 'stack too deep' error by minimizing the number of local variables
    )
```

Requirements:

- States form a chain of valid transitions
- Signatures are valid for the states
- The `largestTurnNum` > `turnNumRecord`

Effects:

- Increases `turnNumRecord`.
- Clears challenge, when exists.

---

## Implementation

Parameters:

- Decode `channelStorageLiteBytes`
- Calculate `channelId` from fixedPart
- Check that `finalizesAt > now || finalizesAt == 0`
- Calculate `storageHash` from `turnNumRecord`, `finalizesAt`, `challengerAddress`, `challengeStateHash`, `challengeOutcomeHash`
- Check that `channelStorageHashes[channelId] == storageHash`
- Check that a state with `turnNum = largestTurnNum` is supported by the input data (if there is none, revert). Do this by calling the `_stateSupportedBy` method.
- Set channelStorage:
  - `turnNumRecord = largestTurnNum`
  - Other fields set to their null values (see [Channel Storage](./channel-storage)).
