---
id: checkpoint
title: checkpoint
---

The `checkpoint` method allows anyone with a supported off-chain state to establish a new and higher `turnNumRecord` and leave the resulting channel in the "Open" mode.

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, the `turnNumRecord` is updated, and a challenge, if exists is cleared.

## Specification

Signature:

```solidity

    function checkpoint(
        FixedPart memory fixedPart,
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
    )
```

Requirements:

- The channel is not finalized
- The `largestTurnNum` > `turnNumRecord`
- States and signatures support the last state

Effects:

- Increases `turnNumRecord`.
- Clears challenge, when exists.
