---
id: intro
title: Introduction
---

ForceMove is a state channel execution framework.

## State Channels

State channels are a layer 2 technique for allowing high throughput transactions with instant finality, supported by an underlying blockchain.
Assets in escrow, governed by a "channel".
The final state (or outcome) of this channel will determine how the assets will be split.
Participants to the channel exchange signed states off-chain to update the state of the channel - jointly executing a protocol.

Use the chain to give protection against one or more participants from blocking, preventing the channel from completing.
This is often referred to as the dispute process.

## What is ForceMove?

ForceMove is a framework to manage the state channel update process.
Rules for state updates
Extensible - allowing developers to define their own state update rules.
Dispute process
It is responsible for ensuring a channel will always reach an outcome.

Doesn't specify how the channels should be funded.
Supports multiple approaches

In practice force-move a ForceMove implementation defines a state format and a set of smart contracts to manage the dispute process.
This can be used with a state channel funding framework (e.g. Nitro) to produce

Everything required for getting to an outcome.

## About the site

To serve as a succinct specification of the ForceMove protocol.

Things have changed since the original paper.
Names have changed. Optimizations have been added.
This should serve as the definitive version over time.

Spec + implementation
