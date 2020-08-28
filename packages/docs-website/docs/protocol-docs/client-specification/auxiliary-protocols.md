---
id: auxiliary-protocols
title: Auxiliary Protocols
sidebar_label: Auxiliary Protocols
---

In this section we provide procedures for various tasks that use Nitro and are value preserving for all participants: that is to say, a series of state channel network configurations connected by Nitro operations that preserves the extractable assets for each participant.

## Ledger-funding

This technique involves opening and funding a "consensus game" or "ledger" state channel between the participants, following [the steps for direct funding](../state-channels/quick-start). The [consensus game state machine](../forcemove-and-nitro/consensus-app) is a core part of Nitro protocol. It describes a very simple state channel whose purpose is to fund other channels, by declaring funds be directed to a channel address instead of an externally owned address.

Once in place, the ledger channel can be updated to fund any other state channel the participants are interested in, by following the following auxiliary protocol:

- Prepare the application channel by exchanging pre fund states.
- Run the consensus game in the ledger channel to update it to a finalizable outcome which allocates funds to the application channel and reduces the total funds allocated to participants accordingly.

Such an application channel is said to be ledger-funded; no blockchain transactions are required to fund or de-fund a ledger-funded channel. Disputes are still resolved on chain.

<div class="mermaid" align="center">
graph TD
linkStyle default interpolate basis
BC[fa:fa-landmark]
L((L))
C((C))
BC-->L
L-->C
</div>

## Topping-up  
Assume C wishes to increase their balance in a funded channel by x

- Run the consensus game to update the outcome of the channel such that C has lowest priority but has x more coins than before
- The channel is currently underfunded \(hence value preservation\)
- C deposits x into the channel, it becomes funded.

## Partial withdrawal
Assume C wishes to decrease their balance in a funded channel L by x

- Prepare a new channel L' with the desired new outcomes \(the same as L but with C allocated x less\)
- Run the consensus game in L to update its outcome such that C is allocated x, and L' is allocated x less than L.
- C transfers and withdraws from L now or at their leisure
- Application continues in L'.

## Offloading an indirectly funded channel
For example, we wish to take a game of Rock Paper Scissors and make it directly funded, rather than indirectly via a ledger channel

- call transfer\(ledger_channel, application_channel, indirect_funding_of_application_channel\)

## Closing off-chain

- Finalize via cooperative channel closing \(see above\) but instead of submitting the proof to the on chain adjudicator:
  - Update the parent ledger channel to defund the application channel and to increase the funds allocated to the participants accordingly
  - Discard application channel

## Virtual-funding

This technique leverages a pair (or more) of existing ledger channels L1, L2 to fund a channel among participants who are not all participating in either of those ledger channels. To be opened and closed safely, guarantor channels G1, G2 are used to re-prioritize the ledger channel payouts. A channel V that is funded in this way is said to be virtually-funded; no blockchain transactions are required to fund or de-fund a virtually-funded channel, and the participants do not need to share an on chain deposit. Instead they need to have a ledger channel open with a shared intermediary. Disputes are still resolved on chain.

<div class="mermaid" align="center">
graph TD
linkStyle default interpolate basis
BC1[fa:fa-landmark]
L1((L1))
L2((L2))
G1((G1))
G2((G2))
J((J))
V((V))
BC1-->L1
BC1-->L2
L1-->G1
L2-->G2
G1-->J
G2-->J
J-->V
</div>

The auxiliary protocol is:

Begin with a pair of directly funded ledger channels, with respective participants \[A,I\] and \[B,I\].

- Prepare a channel V with participants \[A,B\] with allocations for each no larger than the minimum allocation in each of the ledger channels.
- Prepare a three party joint channel J, with I's allocation \(the ‘colateral’\) sufficient to fund V.
- Prepare a pair of guarantor channels BIA and AIB, each guaranteeing / reprioritising J's outcome in a different order.
- Indirectly fund BIA from the \[A,I\] channel and AIB from the \[B,I\] channel, in any order.
- Run the consensus game in the joint channel J, to update its outcome to fund the virtual channel V and the intermediary I.
