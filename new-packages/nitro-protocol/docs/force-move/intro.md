---
id: intro
title: Introduction
---

ForceMove is a state channel execution framework. It enables disputes to be adjudicated, and for _outcomes_ to be registered against a unique `channelId`.

ForceMove does not directly handle the escrow of funds for a state channel. n outcome can be interpreted by any other contract, such as an AssetHolder. If the AssetHolder is compatible with Nitro protocol, the outcome can be formatted such that ledger and virtual channels may be funded -- and state channel networks may be built.

## State Channels

State channels are a layer 2 technique for allowing high throughput transactions with instant finality, supported by an underlying blockchain.
Assets are typically held on chain in escrow, and their ultimate dispersal is dictated by an outcome: information stored and updated off-chain in the state channel.

Participants to the channel exchange signed states off-chain to update the state of the channel - jointly executing a protocol.

In ForceMove, it is possibnle to Use the chain to give protection against one or more participants from blocking: this alleviates problems arising from inactivity which would otherwiase preven the channel from completing. This is often referred to as the dispute process, and it ensures that a channel can always be made to reach an outcome within a bounded amount of time.

## What is ForceMove?

ForceMove is an extensible framework to manage the state channel update process (sometimes called a generalized state channel framework).
There are core framework rules for valid state updates, but these may be augmented by developers who can define their own state update rules.

## About the site

To serve as a definitive and succinct specification of the ForceMove protocol, containing any optimizations and improvements made since the [original whitepaper](https://magmo.com/force-move-games.pdf).

In the sidebar you will find links to the ForceMove specification, which details the data that must be included in state updates, as well as the format of that data and the behaviour of the on chain smart contract supporting ForceMove channels. There is some information about the current implementation of these contracts and how the implement the specification.
