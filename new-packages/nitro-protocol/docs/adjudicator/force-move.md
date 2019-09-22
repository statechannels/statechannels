---
id: force-move
title: forceMove
---

The `forceMove` function allows anyone holding the appropriate off-chain state to register a challenge on chain, and gives the framework its name. It is designed to ensure that a state channel can progress or be finalized in the event of inactivity on behalf of a participant (e.g. the current mover).

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, an `outcome` is registered against the `channelId`, with a finalization time set at some delay after the transaction is processed. This delay allows the challenge to be cleared by a timely and well-formed [respond](./respond), [checkpoint](./checkpoint) or [refute](./refute) transaction. If no such transaction is forthcoming, the challenge will time out, allowing the `outcome` registered to be finalized. A finalized outcome can then be used to extract funds from the channel.

## Specification

Signature:

```solidity
    function forceMove(
        FixedPart memory fixedPart,
        uint256 largestTurnNum,
        ForceMoveApp.VariablePart[] memory variableParts,
        uint8 isFinalCount, // how many of the states are final
        Signature[] memory sigs,
        uint8[] memory whoSignedWhat,
        Signature memory challengerSig
    ) public
```

Check:

- `largestTurnNum` is greater than or equal to turnNumRecord
- Channel is not finalized
- States and signatures support the challenge state (the maximal state)
- `challengerSig` proves that some participant signed the challenge state.

Effects:

- Sets or updates the following ChannelStorage properties:
  - `turnNumRecord` to the `largestTurnNum`
  - `finalizesAt` to `currentTime` + `challengeInterval`
  - `stateHash`
  - `challengerAddress`
- Emit a `ChallengeRegistered` event

:::note
The challenger needs to sign this data:

```
keccak256(abi.encode(challengeStateHash, 'forceMove'))
```

in order to form `challengerSig`. This signals their intent to forceMove this channel with this particular state. This mechanism allows the forceMove to be authorized only by a channel participant: this means the challenge may be refuted, if a refuter can prove that the challenger has signed a later state.
:::
