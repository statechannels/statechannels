---
id: force-move-intro
title: Introduction to ForceMove
---

:::tip
In Nitro protocol assets are held on chain in escrow, and their ultimate dispersal is dictated by an **outcome**: information stored and updated off-chain in the state channel.
:::

ForceMove is a state channel execution framework. It

1. Specifies a programmable state format,
2. Enables disputes to be adjudicated,
3. Allows for an **outcome** to be registered against a unique `channelId`.

### Programmable

ForceMove is an extensible framework to manage the state channel update process (sometimes called a generalized state channel framework).
There are core framework rules for valid state updates, but these may be augmented by developers who can define their own state update rules. In this way, a huge variety of applications may be "channelized".

### Secure

In ForceMove, it is possible to use the chain to give protection against one or more participants from blocking: this alleviates problems arising from inactivity which would otherwise prevent the channel from completing. Often referred to as the dispute process, it ensures that a channel can always be made to reach an outcome within a bounded amount of time.

### Incentivized

ForceMove does not directly handle the escrow of funds for a state channel: instead it is concerned only with the joint computation of an outcome by a fixed set of participants. When it becomes final, that outcome is interpreted by one or more AssetHolder contracts. If the AssetHolder is compatible with Nitro protocol, the outcome can be formatted such that ledger and virtual channels may be funded -- and state channel networks may be built.
