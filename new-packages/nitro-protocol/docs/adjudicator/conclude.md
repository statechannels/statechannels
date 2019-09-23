---
id: conclude
title: conclude
---

If a participant signs a state with `isFinal = true`, then in a cooperative channel-closing procedure the other players can countersign that state and broadcast it. Once a full set of `n` such signatures exists \(this set is known as a **finalization proof**\) anyone in possession may use it to finalize the channel on-chain. They would do this by calling `conclude` on the adjudicator.

:::tip
In Nitro, the existence of this possibility can be relied on \(counterfactually\) to [close a channel off-chain](../auxiliary-protocols#closing-off-chain).
:::

The conclude methods allow anyone with sufficient off-chain state to immediately finalize an outcome for a channel without having to wait for a challenge to expire.

The off-chain state is submitted (in an optimized format), and once relevant checks have passed, an expired challenge is stored against the `channelId`.

## Specification

Signature

```solidity
    function conclude(States states, Signatures sigs)
```

Checks:

- Channel is not finalized
- A finalization proof has been provided

Effects:

- Sets `finalizesAt` to current time
- Sets `outcomeHash` to be consistent with finalization proof
- Clears `stateHash`
- Clears `turnNumRecord`
- Clears `challengerAddress`
