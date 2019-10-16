---
id: overview
title: Overview
---
Welcome to the nitro-protocol state channels documentation site. In this introductory pages, you will find a high level description of state channels; their use-cases and the challenges they represent; our solution to those challenges. You will also find a quick start guide to help you nitro-charge / channelize your DApp using our framework.

Elsewhere on the site you will find interfaces for the smart contracts that support a nitro state channel network, as well as documentation for a reference implementation that is gas optimized and well tested.

## What is a State Channel?

State channels are a technique improving the scalability of a blockchain, and for increasing throughput for some of its Decentralized Applications (DApps).

A state channel provides an environment where a set of parties can update a shared off-chain state, by exchanging signed data between themselves.
Once the parties have finished, they may present the final version of the state to the blockchain, which in turn triggers changes to the on-chain state.

The state channel leverages properties of the underlying chain, to allow the entire operation to be conducted without the need for the parties to trust one another.

### A simple example

The quickest way to gain an understanding of state channel and their capabilities is by looking at a simple example.
Here we look at the example of a two-party, _direct_ state channel, between Alice and Bob.

Let's suppose that Alice and Bob want to use a state channel for payments: for example, Alice might be streaming a video from Bob, and wants to pay Bob per megabyte she consumes.
Executing each payment as a blockchain transaction would be too slow and costly.

To execute the payments through a state channel, instead, Alice and Bob proceed as follows:

1. Alice and Bob agree to open a state channel. By doing this, they agree to a `channelId`, an initial state, and a set of update rules. In this case, the initial balances might be `{A: 10, B: 0}` - 10 coins to Alice and 0 coins to Bob. The update rules might say that Alice can send coins to Bob, but Bob can't unilaterally take coins from Alice.
2. Alice deposits the coins into an _asset holder_, where they are held specifically for the Alice and Bob's channel. In our example, Bob doesn't need to send any coins because his channel balance starts out at 0 coins.
3. Alice and Bob then update the state of the channel, by sending signed state updates to one another. For example, Alice might send an updated state where the balances are now `{A: 9, B: 1}`. For an update to be valid, it must conform to the update rules.
4. When Alice and Bob are finished, they submit the final state of the channel to a smart contract called the __adjudicator__. The __adjudicator__ uses this to finalize the outcome of the channel on-chain.
5. Once the outcome is finalized, the __adjudicator__ sends it to another contract called the __asset holder__, which releases coins back to Alice and Bob accordingly.

Other applications that are a good fit for state channels include games, multi-asset atomic swap and mixers.

### What is difficult about State Channels?

The first major difficulty in state channels is the possibility that one of the participants might block, or go offline. A desirable property of state channel frameworks is that an honest participant

1. Can ensure the channel advances or ends in a finite amount of time
2. Can ensure that the channel does not close in anything but the latest state

and ideally we would like this property even when there is only a single honest participant in the channel. 

The second difficulty is the residual cost of running _direct_ state channels, which still require a number of blockchain transactions that scales with the number of channels or applications. Although this is far superior to running applications entirely on chain (the number of transactions scales with the number of state updates), there is still some room for further improvement through the use of ledger and virtual channels. 

## Our solution: ForceMove and Nitro

Our solution to these difficulties breaks into two parts. The first, ForceMove protocol, is concerned with progressing, adjudicating, and finalizing single channels. The second, Nitro protocol, is concerned with managing funding relationships between channels, on-chain deposits and external accounts. Together they enable state channel networks to be built, and provide DApps that run in those networks with favorable the security, speed and cost properties.


### Outcomes vs Effects

:::tip
In essence, ForceMove protocol is used to ensure a channel reaches a final __outcome__, and Nitro protocol is used to interpret that __outcome__ and to trigger the appropriate on or off-chain state changes (__effects__). ForceMove specifies the behavior of the __adjudicator__ contract, and Nitro specifies the behavior of any __asset holder__ contract.
:::

In the example above, you'll notice that the process of withdrawing funds from the state channel involved two separate steps:

1. Finalizing an outcome in the __adjudicator__
2. Releasing funds from an __asset holder__ based on this outcome

Splitting into these two steps makes it easier to build our channels into state channel networks, where one channel can be funded by another channel.

ForceMove protocol must therefore specify

- how to advance state
- what to do if a co-party goes offline
- how to finalize the outcome on-chain

ForceMove defines everything to get an outcome finalized in the __adjudicator__.
As far as the __adjudicator__ is concerned, the outcome is just some `bytes` that it is not concerned with the meaning of.

Nitro defines everything to do with asset holders, and specifies how outcomes are to be decoded as well as how to keep track of funding relationships between on chain deposits and channels (so-called _direct_ funding) as well as between special 'ledger' channels and other channels (so-called _indirect_ or _virtual_ funding).